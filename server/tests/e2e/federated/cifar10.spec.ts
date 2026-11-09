import type { Task } from "@epfml/discojs";
import { defaultModels, defaultTasks } from "@epfml/discojs";
import { assert, describe, expect, it } from "vitest";
import { datasets } from "../../utils.js";
import { runFederatedUser, startServer } from "../helpers.js";

describe("end-to-end federated cifar10", () => {
  it("three cifar10 users reach consensus", { timeout: 200_000 }, async () => {
    const task = await defaultTasks.cifar10.getTask();
    const cifar10Task: Task<"image", "federated"> = {
      ...task,
      trainingInformation: {
        ...task.trainingInformation,
        privacy: undefined,
        scheme: "federated",
        aggregationStrategy: "mean",
        minNbOfParticipants: 2,
        validationSplit: 0.5,
      },
    };
    const cifar10TaskProvider = {
      getTask: () => Promise.resolve(cifar10Task),
      modelCard: defaultModels.CIFAR10Classifier,
    };
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      cifar10TaskProvider,
    );
    const dataset = await datasets.loadCifar10();

    const [[m1, l1], [m2, l2], [m3, l3]] = await Promise.all([
      runFederatedUser(url, cifar10Task, dataset),
      runFederatedUser(url, cifar10Task, dataset),
      runFederatedUser(url, cifar10Task, dataset),
    ]);

    for (const lastEpoch of [l1, l2, l3]) {
      expect(lastEpoch.training.accuracy).to.be.greaterThan(0.4);
      expect(lastEpoch.validation?.accuracy).to.be.greaterThan(0.4);
    }
    assert.isTrue((await m1.equals(m2)) && (await m2.equals(m3)));
  });
});
