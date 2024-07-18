import type * as http from "http";

import {
  aggregator as aggregators,
  client as clients,
  defaultTasks,
} from "@epfml/discojs";

import { startServer } from "../../src/index.js";

const TASK = defaultTasks.titanic.getTask();

describe("federated client", function () {
  this.timeout(60_000);

  let server: http.Server;
  let url: URL;
  beforeEach(async () => {
    [server, url] = await startServer();
  });
  afterEach(() => {
    server?.close();
  });

  it("connect to & disconnect from valid task", async () => {
    const client = new clients.federated.FederatedClient(
      url,
      TASK,
      aggregators.getAggregator(TASK),
    );
    await client.connect();
    await client.disconnect();
  });

  it("connect to non valid task", async () => {
    const client = new clients.federated.FederatedClient(
      url,
      {
        id: "nonValidTask",
        displayInformation: {
          taskTitle: 'mock title',
          summary: { overview: '', preview: '' }
        },
        trainingInformation: {
          modelID: "irrelevant",
          epochs: 1,
          roundDuration: 1,
          validationSplit: 0,
          batchSize: 1,
          scheme: "federated",
          dataType: "tabular",
          tensorBackend: 'tfjs'
        },
      },
      aggregators.getAggregator(TASK),
    );

    try {
      await client.connect();
    } catch {
      return;
    }

    throw new Error("connect didn't fail");
  });
});
