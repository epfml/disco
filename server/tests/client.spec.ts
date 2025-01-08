import type * as http from "http";
import { Set } from "immutable";

import type { DataType, Task, TaskProvider } from "@epfml/discojs";
import {
  aggregator as aggregators,
  client as clients,
  defaultTasks,
} from "@epfml/discojs";

import { Server } from "../src/index.js";

Set.of<
  [
    string,

    new (
      url: URL,
      task: Task<DataType>,
      aggregator: aggregators.Aggregator,
    ) => clients.Client,
  ]
>(
  ["decentralized", clients.decentralized.DecentralizedClient],
  ["federated", clients.federated.FederatedClient],
).forEach(([name, Client]) => {
  describe(`${name} client`, function () {
    let handle: http.Server;
    async function startServer(
      ...tasks: Array<TaskProvider<DataType>>
    ): Promise<URL> {
      const server = await Server.with(...tasks);

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
      const url = await startServer(defaultTasks.titanic);

      const client = new Client(
        url,
        defaultTasks.titanic.getTask(),
        new aggregators.MeanAggregator(),
      );

      await client.connect();
      await client.disconnect();
    });

    it("fails to connect to invalid task", async () => {
      const url = await startServer(); // no task

      const client = new Client(
        url,
        defaultTasks.titanic.getTask(),
        new aggregators.MeanAggregator(),
      );

      try {
        await client.connect();
      } catch {
        return; // fail as expected
      }

      throw new Error("connect didn't fail");
    });
  });
});
