import type * as http from "node:http";
import type {
  DataType,
  Network,
  TaskProvider,
  ModelCard,
} from "@epfml/discojs";
import {
  MeanAggregator,
  DecentralizedClient,
  FederatedClient,
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
