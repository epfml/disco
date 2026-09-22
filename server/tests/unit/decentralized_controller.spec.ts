import type { Task } from "@epfml/discojs";
import { defaultTasks, mtype } from "@epfml/discojs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecentralizedController } from "../../src/controllers/decentralized_controller.js";
import type { DecentralizedFakeWebSocket } from "./fake_websocket.js";
import {
  lastMessageOfType,
  makeDecentralizedFakeWebSocket,
  messagesOfType,
} from "./fake_websocket.js";

import MessageTypes = mtype.MType;

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
    ws: DecentralizedFakeWebSocket,
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

    const ws1 = makeDecentralizedFakeWebSocket();
    const ws2 = makeDecentralizedFakeWebSocket();

    connectAndJoinRound(controller, ws1);
    connectAndJoinRound(controller, ws2);

    expect(lastMessageOfType(ws1, MessageTypes.PeersForRound)).to.not.equal(
      undefined,
    );
    expect(lastMessageOfType(ws2, MessageTypes.PeersForRound)).to.not.equal(
      undefined,
    );

    // Only one peer reports that its peer connections are ready.
    // The other peer never sends ConnectionsReady, so the server timeout should retry.
    ws1.emitMessage({
      type: MessageTypes.ConnectionsReady,
    });

    await vi.advanceTimersByTimeAsync(60_000);

    expect(
      messagesOfType(ws1, MessageTypes.RetryPeerConnections),
    ).to.have.length(1);
    expect(
      messagesOfType(ws2, MessageTypes.RetryPeerConnections),
    ).to.have.length(1);

    expect(messagesOfType(ws1, MessageTypes.ConnectionFail)).to.have.length(0);
    expect(messagesOfType(ws2, MessageTypes.ConnectionFail)).to.have.length(0);
  });

  it("excludes failed peers only after maxConnectionRetry retries are exhausted", async () => {
    const controller = await makeController(3);

    const ws1 = makeDecentralizedFakeWebSocket();
    const ws2 = makeDecentralizedFakeWebSocket();

    connectAndJoinRound(controller, ws1);
    connectAndJoinRound(controller, ws2);

    for (let attempt = 1; attempt <= 3; attempt++) {
      // Simulate only ws1 finishing peer connection establishment.
      ws1.emitMessage({
        type: MessageTypes.ConnectionsReady,
      });

      await vi.advanceTimersByTimeAsync(60_000);

      expect(messagesOfType(ws1, MessageTypes.ConnectionFail)).to.have.length(
        0,
      );
      expect(messagesOfType(ws2, MessageTypes.ConnectionFail)).to.have.length(
        0,
      );

      expect(
        messagesOfType(ws1, MessageTypes.RetryPeerConnections),
      ).to.have.length(attempt);
      expect(
        messagesOfType(ws2, MessageTypes.RetryPeerConnections),
      ).to.have.length(attempt);

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
    expect(
      messagesOfType(ws1, MessageTypes.RetryPeerConnections),
    ).to.have.length(4);
  });
});

describe("DecentralizedController participants updates", () => {
  async function makeController(): Promise<DecentralizedController<"image">> {
    const baseTask = await defaultTasks.cifar10.getTask();
    const task: Task<"image", "decentralized"> = {
      ...baseTask,
      trainingInformation: {
        ...baseTask.trainingInformation,
        scheme: "decentralized",
        aggregationStrategy: "mean",
        roundDuration: 1,
        minNbOfParticipants: 2,
        maxConnectionRetry: 3,
        maxPeerConnectionTime: 60_000,
        maxModelSyncTime: 30_000,
      },
    };

    return new DecentralizedController(task);
  }

  function connect(
    controller: DecentralizedController<"image">,
    ws: DecentralizedFakeWebSocket,
  ): void {
    controller.handle(ws);
    ws.emitMessage({ type: MessageTypes.ClientConnected });
  }

  /** The counts a peer was told about, after it joined */
  const participantsSeen = (ws: DecentralizedFakeWebSocket): number[] =>
    messagesOfType(ws, MessageTypes.ParticipantsUpdate).map(
      (msg) => msg.nbOfParticipants,
    );

  it("counts a peer syncing its model like every other message does", async () => {
    const controller = await makeController();

    const [ws1, ws2, ws3] = [
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
    ];

    // two peers run a first round together
    connect(controller, ws1);
    connect(controller, ws2);
    for (const ws of [ws1, ws2]) {
      ws.emitMessage({ type: MessageTypes.JoinRound });
      ws.emitMessage({ type: MessageTypes.PeerIsReady });
    }
    for (const ws of [ws1, ws2])
      ws.emitMessage({ type: MessageTypes.ConnectionsReady });

    // a third one joins, which has to sync its model before taking part
    connect(controller, ws3);
    expect(
      lastMessageOfType(ws3, MessageTypes.NewDecentralizedNodeInfo)
        ?.joinedMidTraining,
    ).to.be.true;
    expect(
      lastMessageOfType(ws3, MessageTypes.NewDecentralizedNodeInfo)
        ?.nbOfParticipants,
    ).to.equal(3);
    expect(participantsSeen(ws1)).to.deep.equal([3]);

    // the other two start a round without it, as it is still syncing
    for (const ws of [ws1, ws2]) {
      ws.emitMessage({ type: MessageTypes.JoinRound });
      ws.emitMessage({ type: MessageTypes.PeerIsReady });
    }
    const peersForRound = lastMessageOfType(ws1, MessageTypes.PeersForRound);
    // the round leaves the syncing peer out, but it is still a participant
    expect(peersForRound?.peers).to.have.length(1);
    expect(peersForRound?.nbOfParticipants).to.equal(3);
  });

  it("tells the peers when one joins or leaves", async () => {
    const controller = await makeController();

    const [ws1, ws2, ws3] = [
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
    ];

    connect(controller, ws1);
    // the second peer meets the minimum, which EnoughParticipants carries
    connect(controller, ws2);
    expect(participantsSeen(ws1)).to.deep.equal([]);
    expect(
      lastMessageOfType(ws1, MessageTypes.EnoughParticipants)?.nbOfParticipants,
    ).to.equal(2);

    // the third one changes nothing but the count
    connect(controller, ws3);
    expect(participantsSeen(ws1)).to.deep.equal([3]);
    expect(participantsSeen(ws2)).to.deep.equal([3]);
    // it learned the count from the answer to its own join request
    expect(participantsSeen(ws3)).to.deep.equal([]);
    expect(
      lastMessageOfType(ws3, MessageTypes.NewDecentralizedNodeInfo)
        ?.nbOfParticipants,
    ).to.equal(3);

    // leaving while the minimum is still met
    ws3.emitClose();
    expect(participantsSeen(ws1)).to.deep.equal([3, 2]);
    expect(participantsSeen(ws2)).to.deep.equal([3, 2]);

    // dropping below it is carried by WaitingForMoreParticipants instead
    ws2.emitClose();
    expect(participantsSeen(ws1)).to.deep.equal([3, 2]);
    expect(
      lastMessageOfType(ws1, MessageTypes.WaitingForMoreParticipants)
        ?.nbOfParticipants,
    ).to.equal(1);
  });
});
