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

/**
 * A client learns how many participants there are from the message answering
 * its join request, but the server computes that count when sending it. As that
 * message also carries the model weights it can be big and slow, so a smaller
 * EnoughParticipants sent right after can be processed first, carrying a more
 * recent count which the join answer must not overwrite.
 *
 * Reproducing that ordering needs both messages to be sent back to back, which
 * the real server doesn't do, hence the stubbed one below.
 */
describe("client joining while the participants change", () => {
  type JoinAnswer =
    | federatedMessages.MessageFederated
    | decentralizedMessages.MessageFromServer;

  /** Have the client skip fetching the base model, only messages matter here */
  function withoutModel<
    C extends { getLatestModel: () => Promise<Model<DataType>> },
  >(client: C): C {
    client.getLatestModel = () => Promise.resolve({} as Model<DataType>);
    return client;
  }

  /** Answer a join request with the given messages, in the order given */
  async function serveJoinAnswer(
    ...answers: readonly JoinAnswer[]
  ): Promise<[http.Server, URL]> {
    const handle = http.createServer();
    new WebSocketServer({ server: handle }).on("connection", (ws) =>
      ws.on("message", (data: Buffer) => {
        const msg: unknown = msgpack.decode(data);
        if (
          !mtype.hasMessageType(msg) ||
          msg.type !== mtype.MType.ClientConnected
        )
          return;
        for (const answer of answers) ws.send(msgpack.encode(answer));
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

    return [handle, url];
  }

  // sent when another participant joined between the two messages
  const enoughParticipants: mtype.EnoughParticipants = {
    type: mtype.MType.EnoughParticipants,
    nbOfParticipants: 2,
  };

  it("keeps the newer count when federated", async () => {
    const joinAnswer: federatedMessages.NewFederatedNodeInfo = {
      type: mtype.MType.NewFederatedNodeInfo,
      id: "node-id",
      waitForMoreParticipants: true,
      payload: undefined,
      round: 0,
      nbOfParticipants: 1,
    };
    const [handle, url] = await serveJoinAnswer(joinAnswer, enoughParticipants);

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
      await client.disconnect();
      handle.close();
    }
  });

  it("keeps the newer count when decentralized", async () => {
    const joinAnswer: decentralizedMessages.NewDecentralizedNodeInfo = {
      type: mtype.MType.NewDecentralizedNodeInfo,
      id: "node-id",
      waitForMoreParticipants: true,
      joinedMidTraining: false,
      nbOfParticipants: 1,
    };
    const [handle, url] = await serveJoinAnswer(joinAnswer, enoughParticipants);

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
      await client.disconnect();
      handle.close();
    }
  });
});
