import type { Task } from "@epfml/discojs";
import { defaultTasks, mtype } from "@epfml/discojs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DecentralizedController } from "../../src/controllers/decentralized_controller.js";
import type { DecentralizedFakeWebSocket } from "../../tests/fake_websocket.js";
import {
  expectLastMessageOfType,
  lastMessageOfType,
  makeDecentralizedFakeWebSocket,
  messagesOfType,
} from "../../tests/fake_websocket.js";

import MessageTypes = mtype.MType;
import { TrainingController } from "./index.js";

async function makeController(
  maxConnectionRetry: number,
  minNbOfParticipants: number,
): Promise<DecentralizedController<"image">> {
  const baseTask = await defaultTasks.cifar10.getTask();
  const task: Task<"image", "decentralized"> = {
    ...baseTask,
    trainingInformation: {
      ...baseTask.trainingInformation,
      scheme: "decentralized",
      aggregationStrategy: "mean",
      roundDuration: 1,
      minNbOfParticipants,
      maxConnectionRetry,
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

function connectAndJoinRound(
  controller: DecentralizedController<"image">,
  ws: DecentralizedFakeWebSocket,
): void {
  connect(controller, ws);

  ws.emitMessage({
    type: MessageTypes.JoinRound,
  });

  ws.emitMessage({
    type: MessageTypes.PeerIsReady,
  });
}

// runs a whole round (JoinRound, PeerIsReady, ConnectionsReady)
function runRound(peers: DecentralizedFakeWebSocket[]): void {
  for (const ws of peers) {
    ws.emitMessage({ type: MessageTypes.JoinRound });
    ws.emitMessage({ type: MessageTypes.PeerIsReady });
  }
  for (const ws of peers)
    ws.emitMessage({ type: MessageTypes.ConnectionsReady });
}

/** Checks that the server told a participant to crash, then disconnected it */
async function expectCrashed(ws: DecentralizedFakeWebSocket): Promise<void> {
  expectLastMessageOfType(ws, MessageTypes.CrashClient);
  await vi.waitFor(() => {
    expect(ws.nbOfTerminations).toBe(1);
  });
}

describe("DecentralizedController peer connection retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("broadcasts RetryPeerConnections when not all peers finish connecting before timeout", async () => {
    const controller = await makeController(3, 2);

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
    const controller = await makeController(3, 2);

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

    // Reached retries threshold, so the peer that never
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
  /** The counts a peer was told about, after it joined */
  const participantsSeen = (ws: DecentralizedFakeWebSocket): number[] =>
    messagesOfType(ws, MessageTypes.ParticipantsUpdate).map(
      (msg) => msg.nbOfParticipants,
    );

  it("counts a peer syncing its model like every other message does", async () => {
    const controller = await makeController(3, 2);

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
    const controller = await makeController(3, 2);

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

/**
 * A peer resends ClientConnected when the server's answer is late or lost.
 * The server has to answer again without treating it as a new participant.
 */
describe("Join handshake retry", () => {
  it("sends the same NewDecentralizedNodeInfo again", async () => {
    const controller = await makeController(3, 2);
    const ws = makeDecentralizedFakeWebSocket();

    connect(controller, ws);

    // send again a ClientConnected message
    ws.emitMessage({ type: MessageTypes.ClientConnected });

    // We should receive the same NewDecentralizedNodeInfo message again
    const answers = messagesOfType(ws, MessageTypes.NewDecentralizedNodeInfo);
    expect(answers).to.have.length(2);
    expect(answers[1]).to.deep.equal(answers[0]);
    expect(answers[1]).to.include({
      nbOfParticipants: 1,
      waitForMoreParticipants: true,
      joinedMidTraining: false,
    });
  });

  it("does not tell the other peers that someone joined again", async () => {
    const controller = await makeController(3, 2);
    const ws1 = makeDecentralizedFakeWebSocket();
    const ws2 = makeDecentralizedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // ws1 was told once that training can start, and never that someone joined
    expect(messagesOfType(ws1, MessageTypes.EnoughParticipants)).to.have.length(
      1,
    );
    expect(messagesOfType(ws1, MessageTypes.ParticipantsUpdate)).to.have.length(
      0,
    );

    // Resend a ClientConnected message from ws2
    ws2.emitMessage({ type: MessageTypes.ClientConnected });

    // ws1 should not receive any new messages about ws2 joining again
    expect(messagesOfType(ws1, MessageTypes.EnoughParticipants)).to.have.length(
      1,
    );
    expect(messagesOfType(ws1, MessageTypes.ParticipantsUpdate)).to.have.length(
      0,
    );

    // ws2 should receive the NewDecentralizedNodeInfo message again
    expect(
      messagesOfType(ws2, MessageTypes.NewDecentralizedNodeInfo),
    ).to.have.length(2);
  });

  it("tells a peer joining mid-training again that it has to sync its model", async () => {
    const controller = await makeController(3, 2);
    const [ws1, ws2, ws3] = [
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
    ];

    connect(controller, ws1);
    connect(controller, ws2);

    // Run a training round with ws1 and ws2 before ws3 joins
    runRound([ws1, ws2]);

    // Connect ws3 and resend its ClientConnected message
    connect(controller, ws3);
    ws3.emitMessage({ type: MessageTypes.ClientConnected });

    // Check that ws3 receives two NewDecentralizedNodeInfo messages
    const answers = messagesOfType(ws3, MessageTypes.NewDecentralizedNodeInfo);
    expect(answers.map((answer) => answer.joinedMidTraining)).to.deep.equal([
      true,
      true,
    ]);
    expect(answers.map((answer) => answer.nbOfParticipants)).to.deep.equal([
      3, 3,
    ]);
  });

  it("keeps a peer that joined before training in the next rounds when it resends", async () => {
    const controller = await makeController(3, 2);
    const [ws1, ws2, ws3] = [
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
    ];

    for (const ws of [ws1, ws2, ws3]) connect(controller, ws);
    runRound([ws1, ws2, ws3]);

    ws1.emitMessage({ type: MessageTypes.ClientConnected });

    expect(
      expectLastMessageOfType(ws1, MessageTypes.NewDecentralizedNodeInfo)
        .joinedMidTraining,
    ).to.be.false;

    // the others can't start the next round without it
    for (const ws of [ws2, ws3]) {
      ws.emitMessage({ type: MessageTypes.JoinRound });
      ws.emitMessage({ type: MessageTypes.PeerIsReady });
    }
    expect(messagesOfType(ws2, MessageTypes.PeersForRound)).to.have.length(1);

    ws1.emitMessage({ type: MessageTypes.JoinRound });
    ws1.emitMessage({ type: MessageTypes.PeerIsReady });

    const peersForRound = expectLastMessageOfType(
      ws2,
      MessageTypes.PeersForRound,
    );
    expect(peersForRound.aggregationRound).to.equal(1);
    expect(peersForRound.peers).to.have.length(2);
  });
});

describe("Crashing a peer", () => {
  it("because it sends another message before ClientConnected", async () => {
    const controller = await makeController(3, 2);
    const ws = makeDecentralizedFakeWebSocket();
    controller.handle(ws);

    // Send a message before ClientConnected
    ws.emitMessage({ type: MessageTypes.JoinRound });

    await expectCrashed(ws);
  });

  it("because it sends too many joins", async () => {
    const controller = await makeController(3, 2);
    const ws = makeDecentralizedFakeWebSocket();

    connect(controller, ws);

    for (let i = 0; i < TrainingController.MAX_CLIENT_CONNECTION_RETRY; i++) {
      ws.emitMessage({ type: MessageTypes.ClientConnected });
    }

    await expectCrashed(ws);
  });

  it("because it sends an invalid message", async () => {
    const controller = await makeController(3, 2);
    const ws = makeDecentralizedFakeWebSocket();
    connect(controller, ws);

    ws.emitMessage({ type: MessageTypes.ClientConnected });
    ws.emitMessage({ type: MessageTypes.JoinRound });
    ws.emitMessage({ type: MessageTypes.PeerIsReady });

    // Send an invalid message
    ws.emit("message", Buffer.from([0x00]));
    await expectCrashed(ws);
  });

  it("because of a socket error, only disconnects the websocket", async () => {
    const controller = await makeController(3, 2);
    const ws = makeDecentralizedFakeWebSocket();
    connect(controller, ws);

    ws.emit("error", new Error("socket failure"));

    await vi.waitFor(() => {
      expect(ws.nbOfTerminations).to.equal(1);
    });
    expect(messagesOfType(ws, MessageTypes.CrashClient)).to.have.length(0);
  });

  it("does not block later rounds", async () => {
    const controller = await makeController(3, 2);
    const [ws1, ws2, ws3] = [
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
    ];

    for (const ws of [ws1, ws2, ws3]) connect(controller, ws);

    // Make ws1 join the round
    ws1.emitMessage({ type: MessageTypes.JoinRound });
    ws1.emitMessage({ type: MessageTypes.PeerIsReady });

    // Crash ws1 by sending an invalid message
    ws1.emit("message", Buffer.from([0x00]));
    await expectCrashed(ws1);

    // The others should learn it
    await vi.waitFor(() => {
      expect(
        expectLastMessageOfType(ws2, MessageTypes.ParticipantsUpdate)
          .nbOfParticipants,
      ).to.equal(2);
    });

    // The others should be able to keep on training
    for (const ws of [ws2, ws3]) {
      ws.emitMessage({ type: MessageTypes.JoinRound });
      ws.emitMessage({ type: MessageTypes.PeerIsReady });
    }
    // the round starts with the two peers left
    expect(
      expectLastMessageOfType(ws2, MessageTypes.PeersForRound).peers,
    ).to.have.length(1);
  });
});
