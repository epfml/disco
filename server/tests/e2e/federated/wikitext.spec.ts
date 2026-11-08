import { GPT, defaultModels, defaultTasks } from "@epfml/discojs";
import { assert, describe, it } from "vitest";
import { datasets } from "../../utils.js";
import { runFederatedUser, startServer } from "../helpers.js";

describe("end-to-end federated wikitext", () => {
  it("two wikitext reach consensus", { timeout: 500_000 }, async () => {
    const task = await defaultTasks.wikitext.getTask();
    task.trainingInformation = {
      ...task.trainingInformation,
      epochs: 2,
      roundDuration: 2,
      minNbOfParticipants: 2,
    };
    const taskProvider = {
      ...defaultTasks.wikitext,
      getTask: () => Promise.resolve(task),
    };
    const wikitextModelCard = {
      ...defaultModels.Wikitext,
      getModel: () =>
        Promise.resolve(
          new GPT({
            contextLength: task.trainingInformation.contextLength,
            maxIter: 10,
          }),
        ),
    };
    const url = await startServer(wikitextModelCard, taskProvider);
    const dataset = datasets.loadWikitext();

    const [r1, r2] = await Promise.all([
      runFederatedUser(url, task, dataset, false),
      runFederatedUser(url, task, dataset, false),
    ]);
    assert.isTrue(await r1[0].equals(r2[0]));
  });
});
