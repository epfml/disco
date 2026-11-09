import { Disco, WeightsContainer, defaultModels } from "@epfml/discojs";
import { describe, expect, it } from "vitest";
import { datasets } from "../../utils.js";
import {
  expectPeersToAgreeOnModel,
  lusCovidDecentralized,
  recordModelsAtRoundBoundary,
  startServer,
  tensorMemorySnapshot,
} from "../helpers.js";

const expectWeightsToEqual = (a: WeightsContainer, b: WeightsContainer) => {
  expect(a.weights.length).to.equal(b.weights.length);

  a.weights.forEach((w, i) => {
    expect(Array.from(w.dataSync())).to.deep.equal(
      Array.from(b.weights[i].dataSync()),
    );
  });
};

// For task reset testing
const weightTensorShapes = (weights: WeightsContainer): number[][] =>
  weights.weights.map((w) => [...w.shape]);

// Return tensor length to check model weight tensor reset
const modelTensorCount = (weights: WeightsContainer): number =>
  weights.weights.length;

describe("end-to-end decentralized session", () => {
  /**
   * We test if the latest model syncing is working when new participant
   * joins in the middle of the training (when the round > 0).
   *
   * The test workflow
   * 1. Start User1 and User2 starts training
   * 2. Let them complete at least one aggregation round
   * 3. Start User3 when aggregationRound is larger than 0
   * 4. When User3 starts training, model synchronization should be triggered first
   * 5. Compare User3's model weights with User1/User2's latest model weights
   */
  it(
    "performs model syncing when new participant joins in the middle of the training",
    { timeout: 200_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized();
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);
      const dataset = await datasets.loadLusCOVID();

      // the server and dataset are initialized, but not the clients
      const memoryBeforeClients = tensorMemorySnapshot();

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      const discoUser3 = new Disco(task, url, { preprocessOnce: true });

      const modelsUser1 = recordModelsAtRoundBoundary(discoUser1);
      const modelsUser2 = recordModelsAtRoundBoundary(discoUser2);

      try {
        const generatorUser1 = discoUser1.trainByRound(dataset);
        const generatorUser2 = discoUser2.trainByRound(dataset);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        // Existing participants should already have the same aggregated model.
        await expectPeersToAgreeOnModel(modelsUser1, modelsUser2);

        // A completed round already installed the aggregated model, so the
        // peers hold a round-boundary model they haven't recorded yet: it is
        // what their next "local training" would snapshot, and what a newcomer
        // syncing now receives.
        const boundaryAfterLastRound = [discoUser1, discoUser2].map(
          (disco) =>
            new WeightsContainer(
              disco.trainer.model.weights.weights.map((w) => w.clone()),
            ),
        );

        const waitForModelSynced = Promise.race([
          new Promise<WeightsContainer>((resolve) => {
            discoUser3.on("modelSynced", (weights) => {
              // the event only lends the weights
              if (weights !== undefined) resolve(weights.clone());
            });
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Timed out waiting for modelSynced")),
              60_000,
            ),
          ),
        ]);

        const generatorUser3 = discoUser3.trainByRound(dataset);
        // The newcomer's round only completes once the other peers join it, so
        // hold the promise. Model syncing happens first, in a), and the
        // provider answers it while the other peers sit between rounds.
        const user3RoundPromise = generatorUser3.next();

        const syncedWeights = await waitForModelSynced;

        // User 3 should have been synced to a model one of the existing peers
        // held at a round boundary, not to a partially trained one
        const candidates = [
          ...modelsUser1.all(),
          ...modelsUser2.all(),
          ...boundaryAfterLastRound,
        ];
        const matchesAProviderModel = candidates.some((candidate) => {
          try {
            expectWeightsToEqual(syncedWeights, candidate);
            return true;
          } catch {
            return false;
          }
        });
        expect(
          matchesAProviderModel,
          `synced model matches none of the ${candidates.length} models the peers held at a round boundary`,
        ).to.be.true;

        // The newcomer's round completes together with the other peers' next one
        const [user3Round] = await Promise.all([
          user3RoundPromise,
          generatorUser1.next(),
          generatorUser2.next(),
        ]);
        expect(user3Round.done).to.be.false;

        boundaryAfterLastRound.forEach((model) => model.dispose());
        syncedWeights.dispose();
      } finally {
        // release the recorded models, they are not part of what we measure
        modelsUser1.dispose();
        modelsUser2.dispose();
        // Close clients if not already done
        await discoUser1.close().catch(() => {});
        await discoUser2.close().catch(() => {});
        await discoUser3.close().catch(() => {});
      }

      // the model received by the newcomer must be released with the clients
      await new Promise((resolve) => setImmediate(resolve));
      expect(tensorMemorySnapshot().numTensors).to.be.at.most(
        memoryBeforeClients.numTensors,
      );
    },
  );

  it(
    "resets decentralized session after all participants leave",
    { timeout: 200_000 },
    async () => {
      const { task, taskProvider } = await lusCovidDecentralized();
      const url = await startServer(defaultModels.LUSClassifier, taskProvider);

      const dataset = await datasets.loadLusCOVID();

      let shapesBeforeReset: number[][];
      let modelTensorCountBeforeReset: number;

      const discoUser1 = new Disco(task, url, { preprocessOnce: true });
      const discoUser2 = new Disco(task, url, { preprocessOnce: true });
      const modelsUser1 = recordModelsAtRoundBoundary(discoUser1);
      const modelsUser2 = recordModelsAtRoundBoundary(discoUser2);

      try {
        const generatorUser1 = discoUser1.trainByRound(dataset);
        const generatorUser2 = discoUser2.trainByRound(dataset);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        await Promise.all([generatorUser1.next(), generatorUser2.next()]);

        shapesBeforeReset = weightTensorShapes(
          discoUser1.trainer.model.weights,
        );
        modelTensorCountBeforeReset = modelTensorCount(
          discoUser1.trainer.model.weights,
        );

        await expectPeersToAgreeOnModel(modelsUser1, modelsUser2);
      } finally {
        await discoUser1.close().catch(() => {});
        await discoUser2.close().catch(() => {});
      }

      const discoUser3 = new Disco(task, url, { preprocessOnce: true });
      const discoUser4 = new Disco(task, url, { preprocessOnce: true });
      const modelsUser3 = recordModelsAtRoundBoundary(discoUser3);
      const modelsUser4 = recordModelsAtRoundBoundary(discoUser4);

      let user3ModelSynced = false;
      let user4ModelSynced = false;

      discoUser3.on("modelSynced", () => {
        user3ModelSynced = true;
      });
      discoUser4.on("modelSynced", () => {
        user4ModelSynced = true;
      });

      try {
        const generatorUser3 = discoUser3.trainByRound(dataset);
        const generatorUser4 = discoUser4.trainByRound(dataset);

        await Promise.all([generatorUser3.next(), generatorUser4.next()]);

        await Promise.all([generatorUser3.next(), generatorUser4.next()]);

        const shapesAfterReset = weightTensorShapes(
          discoUser3.trainer.model.weights,
        );
        const modelTensorCountAfterReset = modelTensorCount(
          discoUser3.trainer.model.weights,
        );

        expect(shapesAfterReset).to.deep.equal(shapesBeforeReset);
        expect(modelTensorCountAfterReset).to.equal(
          modelTensorCountBeforeReset,
        );

        expect(user3ModelSynced).to.equal(false);
        expect(user4ModelSynced).to.equal(false);

        await expectPeersToAgreeOnModel(modelsUser3, modelsUser4);
      } finally {
        await discoUser3.close().catch(() => {});
        await discoUser4.close().catch(() => {});
      }
    },
  );
});
