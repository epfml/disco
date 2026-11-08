import { Disco, defaultModels } from "@epfml/discojs";
import { describe, expect, it } from "vitest";
import { datasets } from "../../utils.js";
import {
  expectPeersToAgreeOnModel,
  lusCovidDecentralized,
  recordModelsAtRoundBoundary,
  startServer,
  tensorMemorySnapshot,
} from "../helpers.js";

describe("end-to-end decentralized memory", () => {
  it(
    "does not accumulate excessive tensors during decentralized training",
    { timeout: 200_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized();
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);

      const dataset = await datasets.loadLusCOVID();

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });

      const modelsUser1 = recordModelsAtRoundBoundary(discoUser1, {
        keep: "latest",
      });
      const modelsUser2 = recordModelsAtRoundBoundary(discoUser2, {
        keep: "latest",
      });

      // Take the baseline after client/model initialization so expected model
      const memoryBeforeTraining = tensorMemorySnapshot();

      try {
        const generatorUser1 = discoUser1.trainByRound(dataset);
        const generatorUser2 = discoUser2.trainByRound(dataset);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        await expectPeersToAgreeOnModel(modelsUser1, modelsUser2);
      } finally {
        // release the recorded models, they are not part of what we measure
        modelsUser1.dispose();
        modelsUser2.dispose();
        await discoUser1.close().catch(() => {});
        await discoUser2.close().catch(() => {});
      }

      // Let pending close/disconnect microtasks finish before reading tf.memory().
      await new Promise((resolve) => setImmediate(resolve));

      const memoryAfterTraining = tensorMemorySnapshot();

      expect(memoryAfterTraining.numTensors).to.be.at.most(
        memoryBeforeTraining.numTensors,
      );
    },
  );

  // Check memory difference between decentralized learning rounds
  it(
    "observes tensor memory across decentralized training rounds",
    { timeout: 200_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized({
        epochs: 10,
      });
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);

      const dataset = await datasets.loadLusCOVID();

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      // a single model is kept per peer, so the recording doesn't grow with the
      // number of rounds and the per-round memory measurements stay comparable
      const modelsUser1 = recordModelsAtRoundBoundary(discoUser1, {
        keep: "latest",
      });
      const modelsUser2 = recordModelsAtRoundBoundary(discoUser2, {
        keep: "latest",
      });

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
        await expectPeersToAgreeOnModel(modelsUser1, modelsUser2);

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
        // release the recorded models, they are not part of what we measure
        modelsUser1.dispose();
        modelsUser2.dispose();
        await Promise.all([
          discoUser1.close().catch(() => {}),
          discoUser2.close().catch(() => {}),
        ]);
      }
    },
  );

  // Check if all the memories are cleaned when clients close
  it(
    "releases decentralized client tensors when clients close",
    { timeout: 200_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized({ epochs: 1 });
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);
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
            "expected a completed decentralized training round",
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
