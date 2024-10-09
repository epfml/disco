import type * as http from "http";
import {expect} from 'chai'
import {
  aggregator as aggregators,
  client as clients,
  defaultTasks,
} from "@epfml/discojs";

import { Server } from "../../src/index.js";

const TASK_PROVIDER = defaultTasks.titanic;
const TASK = TASK_PROVIDER.getTask();

describe("federated client", () => {
  let server: http.Server;
  let url: URL;
  beforeEach(async () => {
    [server, url] = await new Server().serve(undefined, TASK_PROVIDER);
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
          epochs: 1,
          roundDuration: 1,
          validationSplit: 0,
          batchSize: 1,
          scheme: "federated",
          minNbOfParticipants: 2,
          dataType: "tabular",
          tensorBackend: 'tfjs'
        },
      },
      aggregators.getAggregator(TASK),
    );

    let model
    try {
      model = await client.connect();
    } catch {
      expect(model).to.be.undefined
      return;
    }

    throw new Error("connect didn't fail");
  }).timeout(30_000); // TODO shouldn't fail by timeout
});
