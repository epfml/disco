import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as msgpack from "@msgpack/msgpack";

import type { EventConnection } from "#client/event_connection";
import {
  PeerConnection,
  sendAndWaitWithRetry,
  WebSocketServer,
} from "#client/event_connection";
import type { PeerTransport } from "#client/decentralized/peer";
import * as decentralizedMessages from "#client/decentralized/messages";
import type { Message, NarrowMessage } from "#client/messages";
import { MType } from "#client/mtype";
import type * as federatedMessages from "#client/federated/messages";
import { EventEmitter } from "#utils/event_emitter";

const { sockets, FakeWebSocket } = vi.hoisted(() => {
  const sockets: FakeWebSocket[] = [];
  class FakeWebSocket {
    binaryType = "";
    onmessage?: (event: { data: unknown }) => void;
    onopen?: () => void;
    constructor() {
      sockets.push(this);
    }
  }
  return { sockets, FakeWebSocket };
});
vi.mock("@epfml/isomorphic-ws", () => ({ default: FakeWebSocket }));

/**
 * In-memory fake EventConnection
 */
class FakeConnection
  extends EventEmitter<{ [K in MType]: NarrowMessage<K> }>
  implements EventConnection
{
  readonly sent: Message[] = [];

  send(msg: Message): void {
    this.sent.push(msg);
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

const CLIENT_CONNECTED: Message = { type: MType.ClientConnected };
const RETRY_DELAY_MS = 1_000;

describe("incoming message validation", () => {
  it("ignores malformed peer messages and still delivers the next valid message", () => {
    let receive!: (data: Uint8Array) => void;
    const peer: PeerTransport = {
      on(type, listener) {
        if (type === "data") receive = listener;
      },
      signal: vi.fn(),
      send: vi.fn(),
      drain: vi.fn(async () => {}),
      destroy: vi.fn(async () => {}),
    };
    const connection = new PeerConnection(
      "local",
      "remote",
      new FakeConnection(),
      () => peer,
    );
    const received = vi.fn();
    connection.on(MType.SharedModel, received);

    for (const invalid of [
      new Uint8Array([0xc1]), // Invalid MessagePack.
      new Uint8Array([0x81]), // Truncated MessagePack.
      msgpack.encode({ type: MType.SharedModel, model: "invalid" }),
    ]) {
      expect(() => receive(invalid)).not.toThrow();
    }
    expect(received).not.toHaveBeenCalled();
    const message = { type: MType.SharedModel, model: new Uint8Array([1]) };
    receive(msgpack.encode(message));
    expect(received).toHaveBeenCalledExactlyOnceWith(message);
  });

  it("ignores malformed server messages and still delivers the next valid message", async () => {
    const connecting = WebSocketServer.connect(
      new URL("ws://localhost"),
      decentralizedMessages.isMessageFromServer,
      () => true,
    );
    const socket = sockets.at(-1)!;
    socket.onopen?.();
    const server = await connecting;
    const received = vi.fn();
    server.on(MType.EnoughParticipants, received);

    for (const data of [
      "not an ArrayBuffer",
      new Uint8Array([0xc1]).buffer,
      new Uint8Array([0x81]).buffer,
      Uint8Array.from(msgpack.encode({ type: "invalid" })).buffer,
    ]) {
      expect(() => socket.onmessage?.({ data })).not.toThrow();
    }
    expect(received).not.toHaveBeenCalled();
    const message = { type: MType.EnoughParticipants };
    socket.onmessage?.({
      data: Uint8Array.from(msgpack.encode(message)).buffer,
    });
    expect(received).toHaveBeenCalledExactlyOnceWith(message);
  });
});

/**
 * Builds a NewFederatedNodeInfo message.
 * @param id the node id the server assigns to us in the message
 */
function newNodeInfo(id = "node-id"): federatedMessages.NewFederatedNodeInfo {
  return {
    type: MType.NewFederatedNodeInfo,
    id,
    waitForMoreParticipants: false,
    payload: undefined,
    round: 0,
    nbOfParticipants: 1,
  };
}

describe("sendAndWaitWithRetry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("resolves with server answer immediately", async () => {
    const connection = new FakeConnection();

    const received = sendAndWaitWithRetry(
      connection,
      CLIENT_CONNECTED,
      MType.NewFederatedNodeInfo,
      { retryDelayMs: RETRY_DELAY_MS },
    );

    const answer = newNodeInfo();
    connection.emit(MType.NewFederatedNodeInfo, answer);

    expect(await received).toBe(answer);
    expect(connection.sent).toEqual([CLIENT_CONNECTED]);
  });

  it("resends until the server answers", async () => {
    const connection = new FakeConnection();

    const received = sendAndWaitWithRetry(
      connection,
      CLIENT_CONNECTED,
      MType.NewFederatedNodeInfo,
      { retryDelayMs: RETRY_DELAY_MS, maxAttempts: 5 },
    );

    // Stay silent long enough for two retries to fire
    await vi.advanceTimersByTimeAsync(2.5 * RETRY_DELAY_MS);
    expect(connection.sent).toHaveLength(3);

    const answer = newNodeInfo();
    connection.emit(MType.NewFederatedNodeInfo, answer);

    expect(await received).toBe(answer);
    // The answer stops the retries
    expect(connection.sent).toHaveLength(3);
  });

  it("waits for a whole retry delay before resending", async () => {
    const connection = new FakeConnection();

    // Not awaiting on purpose for the timer
    void sendAndWaitWithRetry(
      connection,
      CLIENT_CONNECTED,
      MType.NewFederatedNodeInfo,
      { retryDelayMs: RETRY_DELAY_MS },
    ).catch(() => {});

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS - 1);
    expect(connection.sent).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(connection.sent).toHaveLength(2);
  });

  it("throws after all attempts", async () => {
    const connection = new FakeConnection();

    const received = sendAndWaitWithRetry(
      connection,
      CLIENT_CONNECTED,
      MType.NewFederatedNodeInfo,
      { retryDelayMs: RETRY_DELAY_MS, maxAttempts: 3 },
    );
    const rejects = expect(received).rejects.toThrow(
      "no NewFederatedNodeInfo received after sending 3 ClientConnected",
    );

    await vi.advanceTimersByTimeAsync(3 * RETRY_DELAY_MS);

    await rejects;
    expect(connection.sent).toHaveLength(3);
  });

  it("keeps only the first answer", async () => {
    const connection = new FakeConnection();

    const received = sendAndWaitWithRetry(
      connection,
      CLIENT_CONNECTED,
      MType.NewFederatedNodeInfo,
      { retryDelayMs: RETRY_DELAY_MS },
    );

    await vi.advanceTimersByTimeAsync(1.5 * RETRY_DELAY_MS);

    // The server ends up answering both the first and the second attempt
    connection.emit(MType.NewFederatedNodeInfo, newNodeInfo("first"));
    connection.emit(MType.NewFederatedNodeInfo, newNodeInfo("second"));

    expect((await received).id).toBe("first");
  });

  it("lets no timers are left behind", async () => {
    const connection = new FakeConnection();

    const received = sendAndWaitWithRetry(
      connection,
      CLIENT_CONNECTED,
      MType.NewFederatedNodeInfo,
      { retryDelayMs: RETRY_DELAY_MS },
    );

    await vi.advanceTimersByTimeAsync(1.5 * RETRY_DELAY_MS);
    connection.emit(MType.NewFederatedNodeInfo, newNodeInfo());
    await received;

    // A pending timer would keep the event loop alive after connecting
    expect(vi.getTimerCount()).toBe(0);
  });
});
