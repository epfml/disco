import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Peer } from "#client/decentralized/peer";
import { Packet } from "#client/decentralized/packet";

const { pc, channel, createPeerConnection } = vi.hoisted(() => {
  const channel = {
    readyState: "open",
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    onbufferedamountlow: null as (() => void) | null,
    onclose: null as (() => void) | null,
    onerror: null as ((event: Event) => void) | null,
    send: vi.fn<(data: Buffer) => void>(),
    close: vi.fn(),
  };
  const pc = {
    connectionState: "connected",
    sctp: { maxMessageSize: 1024 * 1024 * 1024 },
    onconnectionstatechange: null as (() => void) | null,
    createDataChannel: vi.fn(() => channel),
    createOffer: vi.fn(() => Promise.resolve({ type: "offer", sdp: "test" })),
    setLocalDescription: vi.fn(() => Promise.resolve()),
    close: vi.fn(),
  };
  const createPeerConnection = vi.fn(function () {
    return pc;
  });
  return { pc, channel, createPeerConnection };
});

vi.mock("@epfml/isomorphic-wrtc", () => ({
  default: { RTCPeerConnection: createPeerConnection },
}));

describe("peer transport", () => {
  let peer: Peer;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.clearAllMocks();
    channel.readyState = "open";
    channel.bufferedAmount = 0;
    channel.bufferedAmountLowThreshold = 0;
    pc.connectionState = "connected";
    pc.sctp.maxMessageSize = 1024 * 1024 * 1024;
    channel.send.mockImplementation((data) => {
      channel.bufferedAmount += data.length;
    });
    peer = new Peer("1", true);
  });

  afterEach(async () => {
    await peer.destroy();
    vi.useRealTimers();
  });

  it("restores the STUN servers previously supplied by simple-peer", () => {
    expect(createPeerConnection).toHaveBeenCalledWith({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    });
  });

  it.each([16_384, 1024 * 1024 * 1024, Infinity])(
    "fragments and reassembles a payload with a transport limit of %s",
    (limit) => {
      pc.sctp.maxMessageSize = limit;
      const message = Buffer.alloc(2 * 1024 * 1024, 42);
      peer.send(message);

      // Drain the simulated browser buffer and resume via low-buffer events.
      for (let i = 0; i < 3; i++) {
        expect(channel.bufferedAmount).toBeLessThanOrEqual(1024 * 1024);
        channel.bufferedAmount = 0;
        channel.onbufferedamountlow?.();
      }

      const packets = channel.send.mock.calls.map(([data]) => {
        expect(data.length).toBeLessThanOrEqual(65_536);
        expect(data.length).toBeLessThanOrEqual(limit);
        return Packet.decode(data);
      });
      expect(packets[0].totalChunks).toBe(packets.length);
      expect(
        Buffer.concat(packets.map((packet) => packet.payload)).equals(message),
      ).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("waits for room for the next packet before sending", () => {
    channel.bufferedAmount = 1024 * 1024 - 100;
    peer.send(Buffer.alloc(1024));
    expect(channel.send).not.toHaveBeenCalled();

    channel.bufferedAmount = channel.bufferedAmountLowThreshold;
    channel.onbufferedamountlow?.();
    expect(channel.send).toHaveBeenCalledOnce();
  });

  it("retries failures from low-buffer events and subsequent timer callbacks", () => {
    const onError = vi.fn();
    peer.on("error", onError);
    const message = Buffer.alloc(1024, 42);
    channel.bufferedAmount = 1024 * 1024;
    peer.send(message);
    expect(channel.send).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    const failure = new Error("temporary send failure");
    channel.send
      .mockImplementationOnce(() => {
        throw failure;
      })
      .mockImplementationOnce(() => {
        throw failure;
      });
    channel.bufferedAmount = 0;
    expect(() => channel.onbufferedamountlow?.()).not.toThrow();
    expect(onError).toHaveBeenCalledWith(failure);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(10);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);

    // No new browser event is needed once the send succeeds.
    vi.advanceTimersByTime(10);
    expect(channel.send).toHaveBeenCalledTimes(3);
    const sent = channel.send.mock.calls[2][0];
    expect(Packet.decode(sent).payload.equals(message)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels a browser send retry when destroyed", async () => {
    channel.send.mockImplementationOnce(() => {
      throw new Error("temporary send failure");
    });
    peer.send(Buffer.alloc(1024));
    expect(vi.getTimerCount()).toBe(1);

    await peer.destroy();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10);
    expect(channel.send).toHaveBeenCalledOnce();
  });

  it("stops retrying when the channel has closed", () => {
    channel.send.mockImplementationOnce(() => {
      throw new Error("temporary send failure");
    });
    peer.send(Buffer.alloc(1024));
    channel.readyState = "closed";

    vi.advanceTimersByTime(10);
    expect(channel.send).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("continues transfers by polling when low-buffer events are unavailable", async () => {
    await peer.destroy();
    Reflect.deleteProperty(channel, "bufferedAmountLowThreshold");
    peer = new Peer("1", true);

    const message = Buffer.alloc(2 * 1024 * 1024, 42);
    peer.send(message);
    expect(vi.getTimerCount()).toBe(1);

    for (let i = 0; i < 3; i++) {
      channel.bufferedAmount = 0;
      vi.advanceTimersByTime(10);
    }

    const payloads = channel.send.mock.calls.map(
      ([data]) => Packet.decode(data).payload,
    );
    expect(Buffer.concat(payloads).equals(message)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["failed", "closed"])(
    "closes both transports exactly once when the connection becomes %s",
    async (state) => {
      const onClose = vi.fn();
      peer.on("close", onClose);
      pc.connectionState = state;
      pc.onconnectionstatechange?.();
      await peer.destroy();

      expect(channel.close).toHaveBeenCalledOnce();
      expect(pc.close).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledOnce();
      expect(channel.onclose).toBeNull();
      expect(pc.onconnectionstatechange).toBeNull();
    },
  );

  it("closes the peer when its data channel closes", () => {
    const onClose = vi.fn();
    peer.on("close", onClose);
    channel.onclose?.();

    expect(pc.close).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("reports data channel failures and closes the peer", () => {
    const onError = vi.fn();
    const onClose = vi.fn();
    peer.on("error", onError);
    peer.on("close", onClose);
    channel.onerror?.(new Event("error"));

    expect(onError).toHaveBeenCalledOnce();
    expect(pc.close).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cancels a pending buffer poll when destroyed", async () => {
    await peer.destroy();
    Reflect.deleteProperty(channel, "bufferedAmountLowThreshold");
    peer = new Peer("1", true);
    peer.send(Buffer.alloc(2 * 1024 * 1024));
    expect(vi.getTimerCount()).toBe(1);
    const sentChunks = channel.send.mock.calls.length;

    await peer.destroy();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(100);
    expect(channel.send).toHaveBeenCalledTimes(sentChunks);
  });
});
