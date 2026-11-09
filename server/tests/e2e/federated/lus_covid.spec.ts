import { defaultModels, defaultTasks } from "@epfml/discojs";
import { assert, describe, expect, it } from "vitest";
import { datasets } from "../../utils.js";
import { runFederatedUser, startServer } from "../helpers.js";

describe("end-to-end federated lus_covid", () => {
  it("two lus_covid users reach consensus", { timeout: 200_000 }, async () => {
    const task = await defaultTasks.lusCovid.getTask();
    task.trainingInformation = {
      ...task.trainingInformation,
      epochs: 16,
      roundDuration: 2,
      minNbOfParticipants: 2,
    };
    const taskProvider = {
      ...defaultTasks.lusCovid,
      getTask: () => Promise.resolve(task),
    };
    const url = await startServer(defaultModels.LUSClassifier, taskProvider);
    const dataset = await datasets.loadLusCOVID();

    const [[m1, l1], [m2, l2]] = await Promise.all([
      runFederatedUser(url, task, dataset),
      runFederatedUser(url, task, dataset),
    ]);

    for (const lastEpoch of [l1, l2]) {
      expect(lastEpoch.training.accuracy).to.be.greaterThan(0.4);
      expect(lastEpoch.validation?.accuracy).to.be.greaterThan(0.4);
    }
    assert.isTrue(await m1.equals(m2));
  });

  /**
   * Test if federated learning task lus_covid operates correctly with differential privacy
   */
  it(
    "three lus_covid clients meet consensus with differential privacy",
    { timeout: 1_000_000 },
    async () => {
      const task = await defaultTasks.lusCovid.getTask();
      task.trainingInformation = {
        ...task.trainingInformation,
        epochs: 20,
        roundDuration: 10,
        minNbOfParticipants: 3,
        aggregationStrategy: "mean",
        privacy: {
          differentialPrivacy: {
            epsilon: 50,
            delta: 1e-5,
            clippingRadius: 0.1,
          },
        },
      };
      const taskProvider = {
        ...defaultTasks.lusCovid,
        getTask: () => Promise.resolve(task),
      };
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);
      const dataset = await datasets.loadLusCOVID();

      const [[m1, l1], [m2, l2], [m3, l3]] = await Promise.all([
        runFederatedUser(url, task, dataset),
        runFederatedUser(url, task, dataset),
        runFederatedUser(url, task, dataset),
      ]);

      for (const lastEpoch of [l1, l2, l3]) {
        expect(lastEpoch.training.accuracy).to.be.greaterThan(0.4);
        expect(lastEpoch.validation?.accuracy).to.be.greaterThan(0.4);
      }
      assert.isTrue((await m1.equals(m2)) && (await m2.equals(m3)));
    },
  );
});
