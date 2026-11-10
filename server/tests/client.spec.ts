import * as http from "node:http";
import * as msgpack from "@msgpack/msgpack";
import { WebSocket, WebSocketServer } from "ws";
import type {
  DataType,
  Model,
  Network,
  TaskProvider,
  ModelCard,
  decentralizedMessages,
  federatedMessages,
} from "@epfml/discojs";
import {
  MeanAggregator,
  DecentralizedClient,
  FederatedClient,
  WeightsContainer,
  mtype,
  defaultTasks,
  defaultModels,
  ClientCrashError,
  ClientDisconnectedError,
} from "@epfml/discojs";
import { afterEach, describe, expect, it, vi } from "vitest";
// not exported, imported from source to hold its shutdown
import { PeerPool } from "../../discojs/src/client/decentralized/peer_pool.js";
import { Server } from "../src/index.js";
import { TrainingController } from "../src/controllers/index.js";

describe("decentralized client", () => {
  let handle: http.Server;
  async function startServer(
    models: ModelCard<DataType>[],
    tasks: TaskProvider<DataType, Network>[],
  ): Promise<URL> {
    const server = await Server.with(models, tasks);

    let url: URL;
    [handle, url] = await server.serve();
    return url;
  }
  afterEach(
    () =>
      new Promise<void>((resolve, reject) =>
        handle?.close((e) => {
          if (e !== undefined) reject(e);
          else resolve();
        }),
      ),
  );

  it("connects to valid task", async () => {
    const url = await startServer(
      [defaultModels.CIFAR10Classifier],
      [defaultTasks.cifar10],
    );

    const client = new DecentralizedClient(
      url,
      await defaultTasks.cifar10.getTask(),
      new MeanAggregator(),
    );

    await client.connect();
    await client.disconnect();
  });

  it("fails to connect to invalid task", async () => {
    const url = await startServer([], []); // no models or tasks

    const client = new DecentralizedClient(
      url,
      await defaultTasks.cifar10.getTask(),
      new MeanAggregator(),
    );

    await expect(client.connect()).rejects.toThrow();
  });

  it("is disconnected by the server crashing it", async () => {
    const url = await startServer(
      [defaultModels.CIFAR10Classifier],
      [defaultTasks.cifar10],
    );

    const client = new DecentralizedClient(
      url,
      await defaultTasks.cifar10.getTask(),
      new MeanAggregator(),
    );
    await client.connect();
    const connection = (
      client as unknown as {
        _server: {
          send: (msg: mtype.ClientConnected) => void;
          socket: { readyState: number };
        };
      }
    )._server;

    // Listen for the client being stopped, by the server crashing it
    const crashed = new Promise((resolve) =>
      client.stopSignal.addEventListener("abort", resolve, { once: true }),
    );

    // Tries to connect the maximum number of times allowed by the server
    for (let i = 0; i < TrainingController.MAX_CLIENT_CONNECTION_RETRY; i++) {
      const msg: mtype.ClientConnected = {
        type: mtype.MType.ClientConnected,
      };
      connection.send(msg);
    }

    // Make sure the crash occured and that the reason is correct
    await crashed;
    expect(client.stopSignal.reason).to.be.instanceOf(ClientCrashError);
    expect(client.stopSignal.reason).to.have.property(
      "reason",
      "Exceeded maximum number of retries to connect",
    );

    // Make sure the connection is closed after the crash signal is received
    await vi.waitFor(() => {
      expect(connection.socket.readyState).to.equal(WebSocket.CLOSED);
    });

    // Make sure the client can still be disconnected gracefully
    await client.disconnect();
  });
});

describe("federated client", () => {
  let handle: http.Server;
  async function startServer(
    models: ModelCard<DataType>[],
    tasks: TaskProvider<DataType, Network>[],
  ): Promise<URL> {
    const server = await Server.with(models, tasks);

    let url: URL;
    [handle, url] = await server.serve();
    return url;
  }
  afterEach(
    () =>
      new Promise<void>((resolve, reject) =>
        handle?.close((e) => {
          if (e !== undefined) reject(e);
          else resolve();
        }),
      ),
  );

  it("connects to valid task", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );

    const client = new FederatedClient(
      url,
      await defaultTasks.titanic.getTask(),
      new MeanAggregator(),
    );

    await client.connect();
    await client.disconnect();
  });

  it("is disconnected by the server crashing it", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );

    const client = new FederatedClient(
      url,
      await defaultTasks.titanic.getTask(),
      new MeanAggregator(),
    );
    await client.connect();
    const crashed = new Promise((resolve) =>
      client.stopSignal.addEventListener("abort", resolve, { once: true }),
    );

    // contributing to a round the server didn't reach yet makes it crash us
    const connection = (
      client as unknown as {
        _server: {
          send: (msg: federatedMessages.SendPayload) => void;
          socket: { readyState: number };
        };
      }
    )._server;
    connection.send({
      type: mtype.MType.SendPayload,
      payload: new Uint8Array(),
      round: 10,
    });

    await crashed;
    // stopped by the crash, not by a disconnection
    expect(client.stopSignal.reason).to.be.instanceOf(ClientCrashError);
    // the server closes the connection itself
    await vi.waitFor(() => {
      expect(connection.socket.readyState).to.equal(WebSocket.CLOSED);
    });
    await client.disconnect();
  });

  it("fails to connect to invalid task", async () => {
    const url = await startServer([], []); // no task

    const client = new FederatedClient(
      url,
      await defaultTasks.titanic.getTask(),
      new MeanAggregator(),
    );

    await expect(client.connect()).rejects.toThrow();
  });
});

type ServerMessage =
  | federatedMessages.MessageFromServer
  | decentralizedMessages.MessageFromServer;

/** Have a client skip fetching the base model, only messages matter here */
function withoutModel<
  C extends { getLatestModel: () => Promise<Model<DataType>> },
>(client: C): C {
  client.getLatestModel = () => Promise.resolve({} as Model<DataType>);
  return client;
}

/**
 * A server answering a client's messages with whatever `answer` sends
 * Returns a `close` function tearing down every connections
 */
async function serveStub(
  answer: (
    msg: { type: mtype.MType },
    send: (msg: ServerMessage) => void,
  ) => void,
): Promise<{ url: URL; close: () => void }> {
  const handle = http.createServer();
  const socket = new WebSocketServer({ server: handle });

  socket.on("connection", (ws) =>
    ws.on("message", (data: Buffer) => {
      const msg: unknown = msgpack.decode(data);
      if (!mtype.hasMessageType(msg)) return;
      answer(msg, (answer) => ws.send(msgpack.encode(answer)));
    }),
  );

  const url = await new Promise<URL>((resolve) =>
    handle.listen(0, "127.0.0.1", () => {
      const address = handle.address();
      if (address === null || typeof address === "string")
        throw new Error("server didn't listen on a port");
      resolve(new URL(`http://127.0.0.1:${address.port}/`));
    }),
  );

  return {
    url,
    close: () => {
      socket.clients.forEach((ws) => ws.terminate());
      handle.close();
    },
  };
}

/** Resolve once every already queued microtask ran */
const settled = () => new Promise((resolve) => setImmediate(resolve));

/**
 * A client learns how many participants there are from the message answering
 * its join request, but the server computes that count when sending it. As that
 * message also carries the model weights it can be big and slow, so a smaller
 * EnoughParticipants sent right after can be processed first, carrying a more
 * recent count which the join answer must not overwrite.
 *
 */
describe("client joining while the participants change", () => {
  // sent because another participant joined right after this one asked to join
  const enoughParticipants: mtype.EnoughParticipants = {
    type: mtype.MType.EnoughParticipants,
    nbOfParticipants: 2,
  };

  /** Answer a join request with the newer count first, the join answer second */
  const answerJoin =
    (joinAnswer: ServerMessage) =>
    (msg: { type: mtype.MType }, send: (msg: ServerMessage) => void) => {
      if (msg.type !== mtype.MType.ClientConnected) return;
      send(enoughParticipants);
      send(joinAnswer);
    };

  it("keeps the newer count when federated", async () => {
    const joinAnswer: federatedMessages.NewFederatedNodeInfo = {
      type: mtype.MType.NewFederatedNodeInfo,
      id: "node-id",
      waitForMoreParticipants: true,
      payload: undefined,
      round: 0,
      nbOfParticipants: 1, // outdated by the time we read it
    };
    const { url, close } = await serveStub(answerJoin(joinAnswer));

    const client = withoutModel(
      new FederatedClient(
        url,
        await defaultTasks.titanic.getTask(),
        new MeanAggregator(),
      ),
    );

    try {
      await client.connect();

      expect(client.nbOfParticipants).to.equal(2);
      expect(client.waitingForMoreParticipants).to.be.false;
    } finally {
      close();
    }
  });

  it("keeps the newer count when decentralized", async () => {
    const joinAnswer: decentralizedMessages.NewDecentralizedNodeInfo = {
      type: mtype.MType.NewDecentralizedNodeInfo,
      id: "node-id",
      waitForMoreParticipants: true,
      joinedMidTraining: false,
      nbOfParticipants: 1, // outdated by the time we read it
    };
    const { url, close } = await serveStub(answerJoin(joinAnswer));

    const client = withoutModel(
      new DecentralizedClient(
        url,
        await defaultTasks.cifar10.getTask(),
        new MeanAggregator(),
      ),
    );

    try {
      await client.connect();

      expect(client.nbOfParticipants).to.equal(2);
      expect(client.waitingForMoreParticipants).to.be.false;
    } finally {
      close();
    }
  });
});

/**
 * Failing to connect to the round's peers leaves the aggregator with nobody to
 * expect a contribution from, but the peers are still part of the session: the
 * server is the one telling the client how many participants there are, so a
 * failed round start must not have the client report being alone.
 */
describe("peer failing to begin a round", () => {
  it("keeps reporting the participants the server gave", async () => {
    const ownId = "node-id";

    const joinAnswer: decentralizedMessages.NewDecentralizedNodeInfo = {
      type: mtype.MType.NewDecentralizedNodeInfo,
      id: ownId,
      waitForMoreParticipants: false,
      joinedMidTraining: false,
      nbOfParticipants: 2,
    };
    // a peer list containing our own id makes the client fail to begin the
    // round, as failing to connect to the peers of the round would
    const badPeersForRound: decentralizedMessages.PeersForRound = {
      type: mtype.MType.PeersForRound,
      peers: [ownId],
      aggregationRound: 0,
      nbOfParticipants: 2,
    };

    let push: ((msg: ServerMessage) => void) | undefined;
    const { url, close } = await serveStub((msg, send) => {
      push = send;
      switch (msg.type) {
        case mtype.MType.ClientConnected:
          send(joinAnswer);
          break;
        case mtype.MType.PeerIsReady:
          send(badPeersForRound);
          break;
      }
    });

    const client = withoutModel(
      new DecentralizedClient(
        url,
        await defaultTasks.cifar10.getTask(),
        new MeanAggregator(),
      ),
    );

    const participants: number[] = [];
    client.on("participants", (nbOfParticipants) => {
      participants.push(nbOfParticipants);
    });
    // the client gives up on the round right after that status, so waiting for
    // it then letting the pending microtasks run is enough to observe it
    let giveUp: (() => void) | undefined;
    client.on("status", (status) => {
      if (status === "connecting to peers") giveUp?.();
    });
    /** Resolves when the client gives up on the round it is beginning */
    const givesUpOnRound = () =>
      new Promise<void>((resolve) => (giveUp = resolve));

    try {
      await client.connect();
      await client.onRoundBeginCommunication();
      expect(participants).to.deep.equal([2]);

      // the round never completes, the peers of every round are unreachable
      let failedRoundStart = givesUpOnRound();
      const round = client.onRoundEndCommunication(new WeightsContainer([[1]]));
      round.catch(() => undefined);

      // failing to connect to the round's peers
      await failedRoundStart;
      await settled();
      expect(participants).to.deep.equal([2]);

      // being told to start the round over, then failing again
      failedRoundStart = givesUpOnRound();
      push?.({ type: mtype.MType.RetryPeerConnections });
      await failedRoundStart;
      await settled();
      expect(participants).to.deep.equal([2]);
    } finally {
      close();
    }
  });
});

/**
 * Connecting to a peer that left never ends, so the server tells the others
 * to start the round over, which they must hear while still connecting.
 */
describe("peer connecting to a peer that left", () => {
  it("starts the round over when told to", async () => {
    const joinAnswer: decentralizedMessages.NewDecentralizedNodeInfo = {
      type: mtype.MType.NewDecentralizedNodeInfo,
      id: "node-id",
      waitForMoreParticipants: false,
      joinedMidTraining: false,
      nbOfParticipants: 2,
    };
    const peersForRound = (
      peers: string[],
    ): decentralizedMessages.PeersForRound => ({
      type: mtype.MType.PeersForRound,
      peers,
      aggregationRound: 0,
      nbOfParticipants: 2,
    });

    let startedConnecting: () => void;
    const connecting = new Promise<void>(
      (resolve) => (startedConnecting = resolve),
    );
    let nbOfPeerIsReady = 0;
    let nbOfConnectionsReady = 0;
    let push: ((msg: ServerMessage) => void) | undefined;
    const { url, close } = await serveStub((msg, send) => {
      push = send;
      switch (msg.type) {
        case mtype.MType.ClientConnected:
          send(joinAnswer);
          break;
        case mtype.MType.PeerIsReady:
          nbOfPeerIsReady++;
          // first with a peer that left, with a greater id so that we
          // signal first, then without it once the round starts over
          send(peersForRound(nbOfPeerIsReady === 1 ? ["peer-gone-id"] : []));
          break;
        case mtype.MType.SignalForPeer:
          startedConnecting();
          break;
        case mtype.MType.ConnectionsReady:
          nbOfConnectionsReady++;
          send({ type: mtype.MType.StartWeightSharing });
          break;
      }
    });

    const client = withoutModel(
      new DecentralizedClient(
        url,
        await defaultTasks.cifar10.getTask(),
        new MeanAggregator(),
      ),
    );

    try {
      await client.connect();
      await client.onRoundBeginCommunication();
      const round = client.onRoundEndCommunication(new WeightsContainer([[1]]));

      // stuck connecting to the peer that left
      await connecting;
      push?.({ type: mtype.MType.RetryPeerConnections });

      // the round goes on without it
      await round;
      expect(nbOfPeerIsReady).to.equal(2);
      expect(nbOfConnectionsReady).to.equal(1);
    } finally {
      await client.disconnect();
      close();
    }
  });
});

/**
 * No message arrives once a client disconnected, so whatever it was waiting
 * for on the server has to stop rather than wait forever.
 */
describe("client disconnecting while waiting on the server", () => {
  const decentralizedJoinAnswer = (
    waitForMoreParticipants: boolean,
  ): decentralizedMessages.NewDecentralizedNodeInfo => ({
    type: mtype.MType.NewDecentralizedNodeInfo,
    id: "node-id",
    waitForMoreParticipants,
    joinedMidTraining: false,
    nbOfParticipants: waitForMoreParticipants ? 1 : 2,
  });

  /** A server answering the join request only */
  const answerJoinOnly =
    (joinAnswer: ServerMessage) =>
    (msg: { type: mtype.MType }, send: (msg: ServerMessage) => void) => {
      if (msg.type === mtype.MType.ClientConnected) send(joinAnswer);
    };

  it("stops waiting for participants when decentralized", async () => {
    const { url, close } = await serveStub(
      answerJoinOnly(decentralizedJoinAnswer(true)),
    );
    const client = withoutModel(
      new DecentralizedClient(
        url,
        await defaultTasks.cifar10.getTask(),
        new MeanAggregator(),
      ),
    );

    try {
      await client.connect();
      const round = client.onRoundBeginCommunication();

      // expect before disconnecting, as disconnecting rejects the round
      const stopped = expect(round).rejects.toBeInstanceOf(
        ClientDisconnectedError,
      );
      await client.disconnect();
      await stopped;
    } finally {
      close();
    }
  });

  it("stops waiting for the peers of the round when decentralized", async () => {
    // the server never sends the peers of the round
    const { url, close } = await serveStub(
      answerJoinOnly(decentralizedJoinAnswer(false)),
    );
    const client = withoutModel(
      new DecentralizedClient(
        url,
        await defaultTasks.cifar10.getTask(),
        new MeanAggregator(),
      ),
    );

    try {
      await client.connect();
      await client.onRoundBeginCommunication();
      const round = client.onRoundEndCommunication(new WeightsContainer([[1]]));
      await settled();

      // expect before disconnecting, as disconnecting rejects the round
      const stopped = expect(round).rejects.toBeInstanceOf(
        ClientDisconnectedError,
      );
      await client.disconnect();
      await stopped;
    } finally {
      close();
    }
  });

  it("stops waiting before closing the connections to peers", async () => {
    // the server never sends the peers of the round
    const { url, close } = await serveStub(
      answerJoinOnly(decentralizedJoinAnswer(false)),
    );
    const client = withoutModel(
      new DecentralizedClient(
        url,
        await defaultTasks.cifar10.getTask(),
        new MeanAggregator(),
      ),
    );

    // closing the connections to peers lets the messages being sent
    // reach them, which takes time: hold it until told to go on
    let closePeers: (() => void) | undefined;
    const peersClosed = new Promise<void>((resolve) => (closePeers = resolve));
    const shutdown = vi
      .spyOn(PeerPool.prototype, "shutdown")
      .mockImplementation(() => peersClosed);

    try {
      await client.connect();
      await client.onRoundBeginCommunication();
      const round = client.onRoundEndCommunication(new WeightsContainer([[1]]));
      await settled();

      const disconnecting = client.disconnect();
      await expect(round).rejects.toBeInstanceOf(ClientDisconnectedError);
      expect(shutdown).toHaveBeenCalledOnce();

      closePeers?.();
      await disconnecting;
    } finally {
      shutdown.mockRestore();
      close();
    }
  });

  it("stops waiting for the server's update when federated", async () => {
    const joinAnswer: federatedMessages.NewFederatedNodeInfo = {
      type: mtype.MType.NewFederatedNodeInfo,
      id: "node-id",
      waitForMoreParticipants: false,
      payload: undefined,
      round: 0,
      nbOfParticipants: 2,
    };
    // the server never answers our contribution
    const { url, close } = await serveStub(answerJoinOnly(joinAnswer));
    const client = withoutModel(
      new FederatedClient(
        url,
        await defaultTasks.titanic.getTask(),
        new MeanAggregator(),
      ),
    );

    try {
      await client.connect();
      await client.onRoundBeginCommunication();
      const round = client.onRoundEndCommunication(new WeightsContainer([[1]]));
      await settled();

      // expect before disconnecting, as disconnecting rejects the round
      const stopped = expect(round).rejects.toBeInstanceOf(
        ClientDisconnectedError,
      );
      await client.disconnect();
      await stopped;
    } finally {
      close();
    }
  });

  /**
   * Connecting to another peer to sync the model never ends if the
   * connection is never established, as the server doesn't relay signals here.
   */
  describe("model syncing", () => {
    /** Resolves once the client tries to connect to another peer */
    let connecting: Promise<void>;
    let startedConnecting: () => void;
    let push: ((msg: ServerMessage) => void) | undefined;

    /** A server making the client sync its model from an unreachable peer */
    async function serveSync(): Promise<{ url: URL; close: () => void }> {
      connecting = new Promise((resolve) => (startedConnecting = resolve));
      return await serveStub((msg, send) => {
        push = send;
        switch (msg.type) {
          case mtype.MType.ClientConnected:
            send({
              ...decentralizedJoinAnswer(false),
              joinedMidTraining: true,
            });
            break;
          case mtype.MType.ModelSyncRequest:
            send({
              type: mtype.MType.ModelProviderInfo,
              providerNode: "provider-id",
            });
            break;
          case mtype.MType.SignalForPeer:
            startedConnecting();
            break;
        }
      });
    }

    it("stops connecting to the provider when disconnected", async () => {
      const { url, close } = await serveSync();
      const client = withoutModel(
        new DecentralizedClient(
          url,
          await defaultTasks.cifar10.getTask(),
          new MeanAggregator(),
        ),
      );

      try {
        await client.connect();
        const round = client.onRoundBeginCommunication();
        await connecting;

        // expect before disconnecting, as disconnecting rejects the round
        const stopped = expect(round).rejects.toBeInstanceOf(
          ClientDisconnectedError,
        );
        await client.disconnect();
        await stopped;
      } finally {
        close();
      }
    });

    /** A task giving little time to sync the model */
    async function quickSyncTask() {
      const task = await defaultTasks.cifar10.getTask();
      return {
        ...task,
        trainingInformation: {
          ...task.trainingInformation,
          maxModelSyncTime: 100,
        },
      };
    }

    it("gives up connecting to the provider after a while", async () => {
      const { url, close } = await serveSync();
      const client = withoutModel(
        new DecentralizedClient(
          url,
          await quickSyncTask(),
          new MeanAggregator(),
        ),
      );

      try {
        await client.connect();

        await expect(client.onRoundBeginCommunication()).rejects.toThrow(
          "Timeout while waiting for the latest model provider to connect",
        );
      } finally {
        await client.disconnect();
        close();
      }
    });

    it("stops connecting to the newcomer when disconnected", async () => {
      const { url, close } = await serveSync();
      const client = withoutModel(
        new DecentralizedClient(
          url,
          await defaultTasks.cifar10.getTask(),
          new MeanAggregator(),
        ),
      );

      try {
        await client.connect();
        // the server picked us to send our model to a newcomer,
        // with a greater id so that we initiate the connection and signal first
        push?.({
          type: mtype.MType.ProvideModelToPeer,
          newNode: "peer-newcomer-id",
        });
        await connecting;

        // the help given on the side stops without an unhandled rejection
        await client.disconnect();
        await settled();
      } finally {
        close();
      }
    });
  });

  /**
   * Connecting to the peers of the round never ends if the connections
   * are never established, as the server doesn't relay signals here.
   */
  describe("connecting to the peers of the round", () => {
    /** Resolves once the client tries to connect to the peers of the round */
    let connecting: Promise<void>;
    let startedConnecting: () => void;
    let push: ((msg: ServerMessage) => void) | undefined;

    // Create a fake server that:
    // - Responds to client connections with a NewDecentralizedNodeInfo
    // - Provides an unreachable peer for the round when the peer is ready
    // - Marks when the client starts connecting to the peers of the round
    async function serveRound(): Promise<{ url: URL; close: () => void }> {
      connecting = new Promise((resolve) => (startedConnecting = resolve));
      return await serveStub((msg, send) => {
        push = send; // Register the send function to be able to re-send messages to the client
        switch (msg.type) {
          case mtype.MType.ClientConnected:
            // Respond to the client connection with a decentralized join answer
            send(decentralizedJoinAnswer(false));
            break;
          case mtype.MType.PeerIsReady:
            // When the peer is ready, return the unreachable peer for the round
            // with a greater id ("other-id" > "node-id"), so that we initiate the connection and signal first
            send({
              type: mtype.MType.PeersForRound,
              peers: ["other-id"],
              aggregationRound: 0,
              nbOfParticipants: 2,
            });
            break;
          case mtype.MType.SignalForPeer:
            // Register that we started connecting
            startedConnecting();
            break;
        }
      });
    }

    it("stops connecting when disconnected", async () => {
      const { url, close } = await serveRound();
      const client = withoutModel(
        new DecentralizedClient(
          url,
          await defaultTasks.cifar10.getTask(),
          new MeanAggregator(),
        ),
      );

      try {
        await client.connect();
        await client.onRoundBeginCommunication();
        const round = client.onRoundEndCommunication(
          new WeightsContainer([[1]]),
        );
        // Wait until the client starts connecting to the peers of the round
        // It gets stuck trying to connect as the peer is unreachable
        await connecting;

        // Make sure that disconnecting stops the client from connecting to the peers of the round
        // expect before disconnecting, as disconnecting rejects the round
        const stopped = expect(round).rejects.toBeInstanceOf(
          ClientDisconnectedError,
        );
        await client.disconnect();
        await stopped;
      } finally {
        close();
      }
    });

    it("stops connecting when crashed", async () => {
      const { url, close } = await serveRound();
      const client = withoutModel(
        new DecentralizedClient(
          url,
          await defaultTasks.cifar10.getTask(),
          new MeanAggregator(),
        ),
      );

      try {
        await client.connect();
        await client.onRoundBeginCommunication();
        const round = client.onRoundEndCommunication(
          new WeightsContainer([[1]]),
        );
        // Wait until the client starts connecting to the peers of the round
        // It gets stuck trying to connect as the peer is unreachable
        await connecting;

        // expect before receiving the crash message, as receiving it will reject the round
        const crashed = expect(round).rejects.toBeInstanceOf(ClientCrashError);
        // Simulate that the client receives a CrashClient message from the server
        push?.({
          type: mtype.MType.CrashClient,
          reason: "Failed to connect to peers of the round",
        });
        await crashed;
      } finally {
        // the caller disconnects a crashed client
        await client.disconnect();
        close();
      }
    });
  });
});
