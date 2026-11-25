// @vitest-environment node
import {
  EventEmitter,
  type PeerEvents,
  type NodeID,
  type SignalData,
} from "@epfml/discojs";
import { afterEach, expect, it, vi } from "vitest";
import { servePeerTransport, workerPeerFactory } from "../peer_transport";

class TestPeer extends EventEmitter<PeerEvents> {
  signal = vi.fn<(signal: SignalData) => void>();
  send = vi.fn<(data: Uint8Array) => void>();
  drain = vi.fn(async (_timeout?: number) => {});
  destroy = vi.fn(async () => {});
}
const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const close of cleanup.splice(0)) close();
});

function setup() {
  const { port1, port2 } = new MessageChannel();
  const natives: TestPeer[] = [];
  const create = vi.fn(() => {
    const peer = new TestPeer();
    natives.push(peer);
    return peer;
  });
  const close = servePeerTransport(port1, create);
  cleanup.push(close, () => port2.close());
  return { create, natives, close, remote: workerPeerFactory(port2) };
}

it("forwards signaling and exact byte slices without detaching caller-owned buffers", async () => {
  const { remote, natives, create } = setup();
  const peer = remote("peer-a" as NodeID, true);
  const received = vi.fn();
  const connected = vi.fn();
  peer.on("data", received);
  peer.on("connect", connected);
  await vi.waitFor(() => expect(natives).toHaveLength(1));
  expect(create).toHaveBeenCalledWith("peer-a", true);
  const signal: SignalData = { type: "offer", sdp: "offer" };
  peer.signal(signal);
  const backing = new Uint8Array([99, 1, 2, 99]);
  peer.send(backing.subarray(1, 3));
  await vi.waitFor(() => expect(natives[0].send).toHaveBeenCalled());
  expect(natives[0].signal).toHaveBeenCalledWith(signal);
  expect(Array.from(natives[0].send.mock.calls[0][0])).toEqual([1, 2]);
  expect(Array.from(backing)).toEqual([99, 1, 2, 99]);
  natives[0].emit("connect", undefined);
  const pooled = Buffer.from([99, 3, 4, 99]);
  natives[0].emit("data", pooled.subarray(1, 3));
  await vi.waitFor(() => expect(received).toHaveBeenCalled());
  expect(Array.from(received.mock.calls[0][0] as Uint8Array)).toEqual([3, 4]);
  expect(Array.from(pooled)).toEqual([99, 3, 4, 99]);
  expect(connected).toHaveBeenCalledOnce();
});

it("waits for drain acknowledgements and isolates retries to the same participant", async () => {
  const { remote, natives } = setup();
  const first = remote("peer-a" as NodeID, true);
  await vi.waitFor(() => expect(natives).toHaveLength(1));
  let release!: () => void;
  natives[0].drain.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const drained = vi.fn();
  const wait = first.drain(123).then(drained);
  await vi.waitFor(() => expect(natives[0].drain).toHaveBeenCalledWith(123));
  expect(drained).not.toHaveBeenCalled();
  release();
  await wait;
  await first.destroy();
  const second = remote("peer-a" as NodeID, true);
  const received = vi.fn();
  second.on("data", received);
  await vi.waitFor(() => expect(natives).toHaveLength(2));
  natives[0].emit("data", new Uint8Array([1]));
  natives[1].emit("data", new Uint8Array([2]));
  await vi.waitFor(() => expect(received).toHaveBeenCalledOnce());
  expect(Array.from(received.mock.calls[0][0] as Uint8Array)).toEqual([2]);
  expect(natives[0].destroy).toHaveBeenCalledOnce();
});

it("releases pending drains when a peer closes and destroys page peers on cleanup", async () => {
  const { remote, natives, close } = setup();
  const peer = remote("peer-a" as NodeID, false);
  const errors = vi.fn();
  peer.on("error", errors);
  await vi.waitFor(() => expect(natives).toHaveLength(1));
  natives[0].drain.mockImplementation(() => new Promise(() => {}));
  const drained = peer.drain();
  await vi.waitFor(() => expect(natives[0].drain).toHaveBeenCalled());
  natives[0].emit("error", new Error("connection failed"));
  natives[0].emit("close", undefined);
  await drained;
  expect(errors.mock.calls[0][0]).toMatchObject({
    message: "connection failed",
  });
  remote("peer-b" as NodeID, false);
  await vi.waitFor(() => expect(natives).toHaveLength(2));
  close();
  expect(natives[1].destroy).toHaveBeenCalledOnce();
});
