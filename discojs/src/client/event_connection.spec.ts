import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventConnection } from "#client/event_connection";
import { sendAndWaitWithRetry } from "#client/event_connection";
import type { Message, NarrowMessage } from "#client/messages";
import { MType } from "#client/mtype";
import type * as federatedMessages from "#client/federated/messages";
import { EventEmitter } from "#utils/event_emitter";

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
    const rejects = expect(received).rejects.toThrow();

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
