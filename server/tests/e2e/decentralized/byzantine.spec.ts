import type { EpochLogs, Task, WeightsContainer } from "@epfml/discojs";
import { Disco, defaultModels, defaultTasks } from "@epfml/discojs";
import { List } from "immutable";
import { describe, it } from "vitest";
import { datasets } from "../../utils.js";
import {
  arrayFromAsync,
  expectAllWSToBeClose,
  startServer,
} from "../helpers.js";

describe("end-to-end decentralized byzantine", { timeout: 50_000 }, () => {
  // Byzantine aggregator
  it(
    "ten cifar10 users reach consensus with byzantine aggregation",
    { timeout: 300_000 },
    async () => {
      const baseTask = await defaultTasks.cifar10.getTask();
      const task: Task<"image", "decentralized"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          scheme: "decentralized",
          aggregationStrategy: "byzantine",
          epochs: 3,
          roundDuration: 1,
          minNbOfParticipants: 10,
          privacy: {
            byzantineFaultTolerance: {
              clippingRadius: 10,
              maxIterations: 1,
              beta: 0.9,
            },
          },
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
