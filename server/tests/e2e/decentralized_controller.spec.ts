import { EventEmitter } from "node:events";
import * as msgpack from "@msgpack/msgpack";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type WebSocket from "ws";
import { client, defaultTasks, type Task } from "@epfml/discojs";

import { DecentralizedController } from "../../src/controllers/decentralized_controller.js";

import MessageTypes = client.messages.type;
import messages = client.decentralized.messages;

type FakeWebSocket = WebSocket & {
  sentMessages: messages.MessageFromServer[];
  emitMessage: (message: messages.MessageToServer) => void;
  emitClose: () => void;
};

function makeFakeWebSocket(): FakeWebSocket {
  const ws = new EventEmitter() as FakeWebSocket;

  ws.sentMessages = [];

  ws.send = vi.fn((data: Buffer | Uint8Array) => {
    const decoded = msgpack.decode(data) as messages.MessageFromServer;
    ws.sentMessages.push(decoded);
  }) as unknown as WebSocket["send"];

  ws.emitMessage = (message: messages.MessageToServer) => {
    ws.emit("message", msgpack.encode(message));
  };

  ws.emitClose = () => {
    ws.emit("close");
  };

  return ws;
}

function lastMessageOfType<T extends messages.MessageFromServer["type"]>(
  ws: FakeWebSocket,
  type: T,
): Extract<messages.MessageFromServer, { type: T }> | undefined {
  return ws.sentMessages
    .filter((message): message is Extract<messages.MessageFromServer, { type: T }> =>
      message.type === type,
    )
    .at(-1);
}

function messagesOfType<T extends messages.MessageFromServer["type"]>(
  ws: FakeWebSocket,
  type: T,
): Extract<messages.MessageFromServer, { type: T }>[] {
  return ws.sentMessages.filter(
    (message): message is Extract<messages.MessageFromServer, { type: T }> =>
      message.type === type,
  );
}

describe("DecentralizedController peer connection retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function makeController(maxConnectionRetry: number) {
    const baseTask = await defaultTasks.cifar10.getTask();
    const task: Task<"image", "decentralized"> = {
      ...baseTask,
      trainingInformation: {
        ...baseTask.trainingInformation,
        scheme: "decentralized",
        aggregationStrategy: "mean",
        roundDuration: 1,
        minNbOfParticipants: 2,
        maxConnectionRetry,
        maxPeerConnectionTime: 60_000,
        maxModelSyncTime: 30_000,
      },
    };

    return new DecentralizedController(task);
  }

  function connectAndJoinRound(
    controller: DecentralizedController<"image">,
    ws: FakeWebSocket,
  ): void {
    controller.handle(ws);

    ws.emitMessage({
      type: MessageTypes.ClientConnected,
    });

    ws.emitMessage({
      type: MessageTypes.JoinRound,
    });

    ws.emitMessage({
      type: MessageTypes.PeerIsReady,
    });
  }

  it("broadcasts RetryPeerConnections when not all peers finish connecting before timeout", async () => {
    const controller = await makeController(3);

    const ws1 = makeFakeWebSocket();
    const ws2 = makeFakeWebSocket();

    connectAndJoinRound(controller, ws1);
    connectAndJoinRound(controller, ws2);

    expect(lastMessageOfType(ws1, MessageTypes.PeersForRound)).to.not.equal(undefined);
    expect(lastMessageOfType(ws2, MessageTypes.PeersForRound)).to.not.equal(undefined);

    // Only one peer reports that its peer connections are ready.
    // The other peer never sends ConnectionsReady, so the server timeout should retry.
    ws1.emitMessage({
      type: MessageTypes.ConnectionsReady,
    });

    await vi.advanceTimersByTimeAsync(60_000);

    expect(messagesOfType(ws1, MessageTypes.RetryPeerConnections)).to.have.length(1);
    expect(messagesOfType(ws2, MessageTypes.RetryPeerConnections)).to.have.length(1);

    expect(messagesOfType(ws1, MessageTypes.ConnectionFail)).to.have.length(0);
    expect(messagesOfType(ws2, MessageTypes.ConnectionFail)).to.have.length(0);
  });

  it("excludes failed peers only after maxConnectionRetry retries are exhausted", async () => {
    const controller = await makeController(3);

    const ws1 = makeFakeWebSocket();
    const ws2 = makeFakeWebSocket();

    connectAndJoinRound(controller, ws1);
    connectAndJoinRound(controller, ws2);

    for (let attempt = 1; attempt <= 3; attempt++) {
        // Simulate only ws1 finishing peer connection establishment.
        ws1.emitMessage({
        type: MessageTypes.ConnectionsReady,
        });

        await vi.advanceTimersByTimeAsync(60_000);

        expect(messagesOfType(ws1, MessageTypes.ConnectionFail)).to.have.length(0);
        expect(messagesOfType(ws2, MessageTypes.ConnectionFail)).to.have.length(0);

        expect(messagesOfType(ws1, MessageTypes.RetryPeerConnections)).to.have.length(attempt);
        expect(messagesOfType(ws2, MessageTypes.RetryPeerConnections)).to.have.length(attempt);

        // After RetryPeerConnections, clients will call establishPeerConnections() again and send PeerIsReady.
        ws1.emitMessage({
        type: MessageTypes.PeerIsReady,
        });
        ws2.emitMessage({
        type: MessageTypes.PeerIsReady,
        });
    }

    // Reached retreis threshold, so the peer that never
    // sent ConnectionsReady should receive ConnectionFail.
    ws1.emitMessage({
        type: MessageTypes.ConnectionsReady,
    });

    await vi.advanceTimersByTimeAsync(60_000);

    expect(messagesOfType(ws2, MessageTypes.ConnectionFail)).to.have.length(1);

    // The peer that did finish connecting stays in the round and is told to retry
    // with the remaining participants.
    expect(messagesOfType(ws1, MessageTypes.ConnectionFail)).to.have.length(0);
    expect(messagesOfType(ws1, MessageTypes.RetryPeerConnections)).to.have.length(4);
    });
});