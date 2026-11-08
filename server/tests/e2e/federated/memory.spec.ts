import type { Task } from "@epfml/discojs";
import { Disco, defaultModels, defaultTasks } from "@epfml/discojs";
import { describe, expect, it } from "vitest";
import { datasets } from "../../utils.js";
import {
  expectWSToBeClose,
  startServer,
  tensorMemorySnapshot,
} from "../helpers.js";

describe("end-to-end federated memory", () => {
  // Check memory difference between federated learning rounds
  it(
    "observes tensor memory across federated training rounds",
    { timeout: 200_000 },
    async () => {
      const baseTask = await defaultTasks.lusCovid.getTask();
      const task: Task<"image", "federated"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          scheme: "federated",
          aggregationStrategy: "mean",
          epochs: 10,
          roundDuration: 1,
          minNbOfParticipants: 2,
        },
      };
      const lusCovidProvider = {
        getTask: () => Promise.resolve(task),
        modelCard: defaultModels.LUSClassifier,
      };

      const url = await startServer(
        defaultModels.LUSClassifier,
        lusCovidProvider,
      );

      const dataset = await datasets.loadLusCOVID();

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });

      try {
        const generators = [
          discoUser1.trainByRound(dataset),
          discoUser2.trainByRound(dataset),
        ];
        const warmupRounds = 2;
        const totalRounds = Math.trunc(
          task.trainingInformation.epochs /
            task.trainingInformation.roundDuration,
        );

        // Run warm up rounds before measuring memory so that model initialization happens
        // and does not measured as memory leakage
        for (let round = 0; round < warmupRounds; round++) {
          const results = await Promise.all(
            generators.map(async (generator) => await generator.next()),
          );

          results.forEach((result) => {
            expect(result.done, "training ended during warm-up").to.equal(
              false,
            );
          });
        }

        await new Promise((resolve) => setImmediate(resolve));

        // Measure the memory before running rounds
        const memoryBeforeMeasuredRounds = tensorMemorySnapshot();
        const measuredRoundSnapshots: ReturnType<
          typeof tensorMemorySnapshot
        >[] = [];
        const numberOfMeasuredRounds = totalRounds - warmupRounds;

        // Record tensor memory after each round
        // Pass condition is that memory should be disposed properly, and should not grow each round
        for (let round = 0; round < numberOfMeasuredRounds; round++) {
          const results = await Promise.all(
            generators.map(async (generator) => await generator.next()),
          );

          results.forEach((result) => {
            expect(
              result.done,
              `training ended during measured round ${round + 1}`,
            ).to.equal(false);
          });

          // Finish the pending asynchronous work, and store the memory measurement for this round
          await new Promise((resolve) => setImmediate(resolve));
          measuredRoundSnapshots.push(tensorMemorySnapshot());
        }

        // Check if two users' models converge
        await expectWSToBeClose(
          discoUser1.trainer.model.weights,
          discoUser2.trainer.model.weights,
        );

        expect(measuredRoundSnapshots).to.have.lengthOf(numberOfMeasuredRounds);

        // Check the allocated tensors did not increase between rounds
        for (let index = 1; index < measuredRoundSnapshots.length; index++) {
          const previousSnapshot = measuredRoundSnapshots[index - 1];
          const currentSnapshot = measuredRoundSnapshots[index];

          expect(currentSnapshot.numTensors).to.be.at.most(
            previousSnapshot.numTensors,
          );
          expect(currentSnapshot.numBytes).to.be.at.most(
            previousSnapshot.numBytes,
          );
        }

        // Get the final memory state
        const finalSnapshot = measuredRoundSnapshots.at(-1);

        if (finalSnapshot === undefined) {
          throw new Error("No tensor memory snapshot was recorded");
        }

        // Check if the final memory state did not grow from the initial state
        // measured after the warm up
        expect(finalSnapshot.numTensors).to.be.at.most(
          memoryBeforeMeasuredRounds.numTensors,
        );
        expect(finalSnapshot.numBytes).to.be.at.most(
          memoryBeforeMeasuredRounds.numBytes,
        );
      } finally {
        await Promise.all([
          discoUser1.close().catch(() => {}),
          discoUser2.close().catch(() => {}),
        ]);
      }
    },
  );

  // Check if memory is cleaned after clients close
  it(
    "releases federated client tensors when clients close",
    { timeout: 200_000 },
    async () => {
      const baseTask = await defaultTasks.lusCovid.getTask();
      const task: Task<"image", "federated"> = {
        ...baseTask,
        trainingInformation: {
          ...baseTask.trainingInformation,
          scheme: "federated",
          aggregationStrategy: "mean",
          epochs: 1,
          roundDuration: 1,
          minNbOfParticipants: 2,
        },
      };
      const lusCovidProvider = {
        getTask: () => Promise.resolve(task),
        modelCard: defaultModels.LUSClassifier,
      };

      const url = await startServer(
        defaultModels.LUSClassifier,
        lusCovidProvider,
      );
      const dataset = await datasets.loadLusCOVID();

      // The server and dataset are initialized, but client models are not loaded
      // Used for comparison with memory after closing clients
      const memoryBeforeClients = tensorMemorySnapshot();

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      const generators = [
        discoUser1.trainByRound(dataset),
        discoUser2.trainByRound(dataset),
      ];
      let clientsClosed = false;

      try {
        // Run one decentalized round so clients allocate the model
        // and establish communication state with other peers
        const completedRounds = await Promise.all(
          generators.map(async (generator) => await generator.next()),
        );
        completedRounds.forEach((result) => {
          expect(
            result.done,
            "expected a completed federated training round",
          ).to.equal(false);
        });

        // Close the clients, this should dispose tensors owned by them
        await Promise.all([discoUser1.close(), discoUser2.close()]);
        clientsClosed = true;

        // After closing the clients, the memory state should return to the
        // memory before clients are created
        const memoryAfterClose = tensorMemorySnapshot();
        expect(memoryAfterClose.numTensors).to.be.at.most(
          memoryBeforeClients.numTensors,
        );
        expect(memoryAfterClose.numBytes).to.be.at.most(
          memoryBeforeClients.numBytes,
        );
      } finally {
        await Promise.allSettled(
          generators.map(
            async (generator) => await generator.return(undefined),
          ),
        );
        if (!clientsClosed) {
          await Promise.allSettled([discoUser1.close(), discoUser2.close()]);
        }
      }
    },
  );
});
