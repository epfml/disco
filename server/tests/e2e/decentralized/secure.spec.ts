import type { EpochLogs, Task, WeightsContainer } from "@epfml/discojs";
import { Disco, defaultModels, defaultTasks } from "@epfml/discojs";
import { List } from "immutable";
import { describe, it } from "vitest";
import { datasets } from "../../utils.js";
import {
  arrayFromAsync,
  expectAllWSToBeClose,
  reachDecentralizedConsensus,
  startServer,
} from "../helpers.js";

describe("end-to-end decentralized secure", { timeout: 50_000 }, () => {
  it("single round of cifar 10 with three secure aggregators yields consensus", async () => {
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      defaultTasks.cifar10,
    );
    await reachDecentralizedConsensus(url, "secure");
  });

  it("several rounds of cifar 10 with three secure aggregators yields consensus", async () => {
    const url = await startServer(
      defaultModels.CIFAR10Classifier,
      defaultTasks.cifar10,
    );
    await reachDecentralizedConsensus(url, "secure", 3);
  });

  // Secure aggregator
  it(
    "ten cifar10 users reach consensus with secure aggregation",
    { timeout: 500_000 },
    async () => {
      const baseTask = await defaultTasks.cifar10.getTask();
      const task: Task<"image", "decentralized"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          scheme: "decentralized",
          aggregationStrategy: "secure",
          epochs: 10,
          roundDuration: 1,
          minNbOfParticipants: 10,
          maxShareValue: 100,
        },
      };

      const url = await startServer(defaultModels.CIFAR10Classifier, {
        ...defaultTasks.cifar10,
        getTask: () => Promise.resolve(task),
      });
      const dataset = await datasets.loadCifar10();

      const discos = Array.from(
        { length: 10 },
        () => new Disco(task, url, { preprocessOnce: true }),
      );

      try {
        const results = await Promise.all(
          discos.map(async (disco) => {
            const logs = List(
              await arrayFromAsync(disco.trainByRound(dataset)),
            );
            const lastEpoch = logs.last()?.epochs.last();
            if (lastEpoch === undefined) throw new Error("no epoch ran");

            return [disco.trainer.model.weights, lastEpoch] as [
              WeightsContainer,
              EpochLogs,
            ];
          }),
        );

        await expectAllWSToBeClose(...results.map(([weights]) => weights));
      } finally {
        await Promise.all(discos.map((disco) => disco.close()));
      }
    },
  );
});
