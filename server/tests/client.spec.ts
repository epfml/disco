import * as http from "node:http";
import * as msgpack from "@msgpack/msgpack";
import { WebSocketServer } from "ws";
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
} from "@epfml/discojs";
import { afterEach, describe, expect, it } from "vitest";
import { Server } from "../src/index.js";

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
  | federatedMessages.MessageFederated
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
