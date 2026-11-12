import type { Task } from "@epfml/discojs";
import { defaultModels, defaultTasks } from "@epfml/discojs";
import { assert, describe, expect, it } from "vitest";
import { datasets } from "../../utils.js";
import { runFederatedUser, startServer } from "../helpers.js";

describe("end-to-end federated titanic", () => {
  it("two titanic users reach consensus", { timeout: 50_000 }, async () => {
    const task = await defaultTasks.titanic.getTask();
    task.trainingInformation = {
      ...task.trainingInformation,
      minNbOfParticipants: 2,
    };
    const taskProvider = {
      ...defaultTasks.titanic,
      getTask: () => Promise.resolve(task),
    };
    const url = await startServer(
      defaultModels.TitanicClassifier,
      taskProvider,
    );
    const dataset = datasets.loadTitanic();

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

  it(
    "two titanic users reach consensus with byzantine aggregation",
    { timeout: 50_000 },
    async () => {
      const baseTask = await defaultTasks.titanic.getTask();
      const task: Task<"tabular", "federated"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          aggregationStrategy: "byzantine",
          aggregationParams: {
            clippingRadius: 10,
            maxIterations: 1,
            beta: 0.9,
          },
          minNbOfParticipants: 2,
        },
      };
      const url = await startServer(defaultModels.TitanicClassifier, {
        ...defaultTasks.titanic,
        getTask: () => Promise.resolve(task),
      });
      const dataset = datasets.loadTitanic();

      const [[m1, l1], [m2, l2]] = await Promise.all([
        runFederatedUser(url, task, dataset),
        runFederatedUser(url, task, dataset),
      ]);

      for (const lastEpoch of [l1, l2]) {
        expect(lastEpoch.training.accuracy).to.be.greaterThan(0.4);
        expect(lastEpoch.validation?.accuracy).to.be.greaterThan(0.4);
      }
      assert.isTrue(await m1.equals(m2));
    },
  );

  it(
    "two titanic users reach consensus with fedprox aggregation",
    { timeout: 50_000 },
    async () => {
      const baseTask = await defaultTasks.titanic.getTask();
      const task: Task<"tabular", "federated"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          aggregationStrategy: "fedprox",
          aggregationParams: { mu: 0.1 },
          minNbOfParticipants: 2,
        },
      };
      const url = await startServer(defaultModels.TitanicClassifier, {
        ...defaultTasks.titanic,
        getTask: () => Promise.resolve(task),
      });
      const dataset = datasets.loadTitanic();

      const [[m1, l1], [m2, l2]] = await Promise.all([
        runFederatedUser(url, task, dataset),
        runFederatedUser(url, task, dataset),
      ]);

      for (const lastEpoch of [l1, l2]) {
        expect(lastEpoch.training.accuracy).to.be.greaterThan(0.4);
        expect(lastEpoch.validation?.accuracy).to.be.greaterThan(0.4);
      }
      assert.isTrue(await m1.equals(m2));
    },
  );
});
