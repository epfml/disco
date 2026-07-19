import * as tf from "@tensorflow/tfjs";
import { List, Repeat } from "immutable";

import {
  Batched,
  BatchLogs,
  Dataset,
  DataFormat,
  DataType,
  EpochLogs,
  Model,
  Task,
  WeightsContainer,
  Network,
  ValidationMetrics,
} from "../index.js";
import { privacy } from "../index.js";
import { Client } from "../client/index.js";
import createDebug from "debug";
import * as async_iterator from "../utils/async_iterator.js";

const debug = createDebug("discojs:training:trainer");

export interface RoundLogs {
  epochs: List<EpochLogs>;
  participants: number;
  preRoundValidation?: ValidationMetrics;
  postAggregationValidation?: ValidationMetrics;
}

/** List of weight update norms */
export type WeightNormHistory = List<List<number>>;

type IterationTrainableTextModel = Model<"text"> & {
  trainNextBatches(
    trainingIterator: AsyncIterator<Batched<DataFormat.ModelEncoded["text"]>>,
    maxBatchCount: number,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded["text"]>>,
    setDone?: (done: boolean) => void,
  ): AsyncGenerator<BatchLogs, EpochLogs>;
};

function appendWeightHistory(
  weightNormHistory: WeightNormHistory,
  wc: number[],
) {
  return wc.reduce((hist, t, i) => {
    const arr = hist.get(i, List<number>());
    return hist.set(i, arr.push(t));
  }, weightNormHistory);
}

/** Train a model and exchange with others **/
export class Trainer<D extends DataType, N extends Network> {
  readonly #client: Client<N>;
  readonly #roundDuration: number;
  readonly #epochs: number;
  readonly #privacy:
    | Task<
        DataType,
        "decentralized" | "federated"
      >["trainingInformation"]["privacy"]
    | undefined;
  #model: Model<D> | undefined;
  #training?: AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  >;
  readonly #roundIterations?: number;
  readonly #validationFrequency?: number;
  // Map of weight Index and weight update
  #weightNormHistory: WeightNormHistory = List();
  #previousRoundWeights?: WeightsContainer;
  readonly #shouldValidateAfterAggregation: boolean;

  public get model(): Model<D> {
    if (this.#model === undefined)
      throw new Error("trainer's model has not been set");
    return this.#model;
  }

  public set model(model: Model<D>) {
    this.#model = model;
  }

  constructor(task: Task<D, N>, client: Client<N>) {
    this.#client = client;
    this.#roundDuration = task.trainingInformation.roundDuration;
    this.#epochs = task.trainingInformation.epochs;
    this.#roundIterations = task.trainingInformation.roundIterations;
    this.#validationFrequency = task.trainingInformation.validationFrequency;
    this.#shouldValidateAfterAggregation =
      task.trainingInformation.scheme !== "local";
    if ("privacy" in task.trainingInformation)
      this.#privacy = task.trainingInformation.privacy;

    if (
      this.#roundIterations !== undefined &&
      (task.dataType !== "text" ||
        task.trainingInformation.tensorBackend !== "gpt")
    )
      throw new Error("roundIterations is only supported for GPT text tasks");

    if (
      this.#roundIterations !== undefined &&
      (!Number.isInteger(this.#roundIterations) || this.#roundIterations < 1)
    )
      throw new Error("roundIterations must be a positive integer");

    if (
      this.#validationFrequency !== undefined &&
      (!Number.isInteger(this.#validationFrequency) ||
        this.#validationFrequency < 0)
    )
      throw new Error("validationFrequency must be a non-negative integer");

    if (
      this.#roundIterations === undefined &&
      !Number.isInteger(this.#epochs / this.#roundDuration)
    )
      throw new Error(
        `round duration ${this.#roundDuration} doesn't divide number of epochs ${this.#epochs}`,
      );
  }

  async stopTraining(): Promise<void> {
    await this.#training?.return();
  }

  async *train(
    dataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  > {
    debug("Start train");
    if (this.#training !== undefined)
      throw new Error(
        "training already running, stop it before launching a new one",
      );

    try {
      this.#training =
        this.#roundIterations === undefined
          ? this.#runRounds(dataset, validationDataset)
          : this.#runIterationRounds(dataset, validationDataset);
      yield* this.#training;
    } finally {
      this.#training = undefined;
    }
  }

  async *#runRounds(
    dataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  > {
    const totalRound = Math.trunc(this.#epochs / this.#roundDuration);

    debug("Run rounds");

    for (let round = 0; round < totalRound; round++) {
      await this.#client.onRoundBeginCommunication();

      // Store the clean weight before starting the communication
      this.#previousRoundWeights = new WeightsContainer(
        this.model.weights.weights.map((t) => t.clone()),
      );

      const roundValidationDataset = this.#shouldValidateRound(round)
        ? validationDataset
        : undefined;

      yield this.#runRound(dataset, roundValidationDataset);

      await this.#finishRoundCommunication(totalRound);
    }
  }

  async *#runIterationRounds(
    dataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  > {
    if (this.#roundIterations === undefined)
      throw new Error("roundIterations was not set");

    const totalRound =
      this.#privacy?.differentialPrivacy === undefined
        ? Number.MAX_SAFE_INTEGER
        : Math.max(
            1,
            Math.ceil((await dataset.size()) / this.#roundIterations) *
              this.#epochs,
          );

    let round = 0;
    for (let epoch = 0; epoch < this.#epochs; epoch++) {
      const trainingIterator = dataset[Symbol.asyncIterator]();
      let next = await trainingIterator.next();
      let pendingBatch: Batched<DataFormat.ModelEncoded[D]> | undefined =
        next.done === true ? undefined : next.value;

      while (pendingBatch !== undefined) {
        await this.#client.onRoundBeginCommunication();

        this.#previousRoundWeights = new WeightsContainer(
          this.model.weights.weights.map((t) => t.clone()),
        );

        let firstBatch: Batched<DataFormat.ModelEncoded[D]> | undefined =
          pendingBatch;
        pendingBatch = undefined;
        let done = false;
        const prefixedIterator: AsyncIterator<
          Batched<DataFormat.ModelEncoded[D]>
        > = {
          next: async () => {
            if (firstBatch !== undefined) {
              const value = firstBatch;
              firstBatch = undefined;
              return { value, done: false };
            }

            return await trainingIterator.next();
          },
        };

        const roundValidationDataset = this.#shouldValidateRound(round)
          ? validationDataset
          : undefined;

        yield this.#runIterationRound(
          prefixedIterator,
          this.#roundIterations,
          roundValidationDataset,
          (roundDone) => (done = roundDone),
        );

        await this.#finishRoundCommunication(totalRound);

        round++;
        if (done) break;
        next = await trainingIterator.next();
        pendingBatch = next.done === true ? undefined : next.value;
      }
    }
  }

  async *#runRound(
    dataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs> {
    let epochsLogs = List<EpochLogs>();

    debug("Run round");

    // Before starting the training, get the validation of global model
    const validation =
      validationDataset !== undefined
        ? await this.model.evaluate(validationDataset)
        : undefined;

    for (let epoch = 0; epoch < this.#roundDuration; epoch++) {
      const [gen, epochLogs] = async_iterator.split(
        this.model.train(dataset, validationDataset),
      );

      yield gen;
      epochsLogs = epochsLogs.push(await epochLogs);
    }

    return {
      epochs: epochsLogs,
      participants: this.#client.nbOfParticipants,
      preRoundValidation: validation,
    };
  }

  async *#runIterationRound(
    datasetIterator: AsyncIterator<Batched<DataFormat.ModelEncoded[D]>>,
    maxBatchCount: number,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    setDone?: (done: boolean) => void,
  ): AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs> {
    let epochsLogs = List<EpochLogs>();

    debug("Run iteration-based round");

    const validation =
      validationDataset !== undefined
        ? await this.model.evaluate(validationDataset)
        : undefined;

    const model = this.model as unknown as IterationTrainableTextModel;
    if (typeof model.trainNextBatches !== "function")
      throw new Error("model does not support iteration-based training");

    const [gen, result] = async_iterator.split(
      model.trainNextBatches(
        datasetIterator as AsyncIterator<
          Batched<DataFormat.ModelEncoded["text"]>
        >,
        maxBatchCount,
        validationDataset as
          | Dataset<Batched<DataFormat.ModelEncoded["text"]>>
          | undefined,
        setDone,
      ),
    );

    yield gen;
    const epochLogs = await result;
    epochsLogs = epochsLogs.push(epochLogs);

    return {
      epochs: epochsLogs,
      participants: this.#client.nbOfParticipants,
      preRoundValidation: validation,
    };
  }

  #shouldValidateRound(round: number): boolean {
    if (this.#validationFrequency === undefined) return true;
    if (this.#validationFrequency === 0) return false;
    return round % this.#validationFrequency === 0;
  }

  async #finishRoundCommunication(
    totalRound: number,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): Promise<ValidationMetrics | undefined> {
    let roundWeights = this.model.weights;
    let disposeRoundWeightsAfterSend = false;

    try {
      if (this.#privacy !== undefined) {
        if (this.#previousRoundWeights === undefined)
          throw new Error("previous round weights were not captured");

        const previousRoundWeights = this.#previousRoundWeights;
        const roundUpdate = roundWeights.sub(previousRoundWeights);
        try {
          const updateNorm = await Promise.all(
            roundUpdate.weights.map(privacy.frobeniusNorm),
          );
          this.#weightNormHistory = appendWeightHistory(
            this.#weightNormHistory,
            updateNorm,
          );
        } finally {
          roundUpdate.dispose();
        }

        const privateRoundWeights = await applyOptimalPrivacy(
          previousRoundWeights,
          roundWeights,
          this.#privacy,
          this.#weightNormHistory,
          totalRound,
        );
        roundWeights = privateRoundWeights;
        disposeRoundWeightsAfterSend = true;
      }

      const networkWeights =
        await this.#client.onRoundEndCommunication(roundWeights);
      this.model.weights = networkWeights;

      return this.#shouldValidateAfterAggregation &&
        validationDataset !== undefined
        ? await this.model.evaluate(validationDataset)
        : undefined;
    } finally {
      if (disposeRoundWeightsAfterSend) roundWeights.dispose();
      this.#previousRoundWeights?.dispose();
      this.#previousRoundWeights = undefined;
    }
  }
}

/** ALDP-FL implementation */
async function applyOptimalPrivacy(
  previous: WeightsContainer | undefined,
  current: WeightsContainer,
  options: Exclude<
    Task<
      DataType,
      "decentralized" | "federated"
    >["trainingInformation"]["privacy"],
    undefined
  >,
  weightNormHistory: WeightNormHistory,
  totalRound: number,
): Promise<WeightsContainer> {
  let ret = current;

  // Clipping radius for BFT
  if ("byzantineFaultTolerance" in options) {
    // might need to change the variable name
    const previousRoundWeights =
      previous ?? current.map((w) => tf.zerosLike(w));
    const weightsProgress = current.sub(previousRoundWeights);
    const clippedProgress = await privacy.clipNorm(
      weightsProgress,
      Repeat(options.byzantineFaultTolerance.clippingRadius)
        .take(weightsProgress.weights.length)
        .toArray(),
    );
    try {
      ret = previousRoundWeights.add(clippedProgress);
    } finally {
      weightsProgress.dispose();
      clippedProgress.dispose();
      if (previous === undefined) previousRoundWeights.dispose();
    }
  }

  // Adding Gaussian noise for DP
  const dpOptions = options.differentialPrivacy;
  if (dpOptions !== undefined) {
    const dpDefaultRadius = dpOptions.clippingRadius; // options.dpDefaultClippingRadius should be a number

    // Divide privacy budget across all rounds (conservative composition)
    const delta = dpOptions.delta / totalRound;
    const epsilon = dpOptions.epsilon / totalRound;

    const dpClippingRadius = privacy.getClippingRadius(
      weightNormHistory,
      dpDefaultRadius,
    );

    const previousEpochWeights =
      previous ?? current.map((w) => tf.zerosLike(w));
    const weightsProgress = current.sub(previousEpochWeights);

    /** Need to use tighter clipping radius for noise calibration */
    const effectiveRadius =
      "byzantineFaultTolerance" in options
        ? dpClippingRadius.map((r) =>
            Math.min(r, options.byzantineFaultTolerance.clippingRadius),
          )
        : dpClippingRadius;

    const sigmas = effectiveRadius.map(
      (r) => (2 * r * Math.sqrt(2 * Math.log(1.25 / delta))) / epsilon,
    );
    debug("DP applied: %O", {
      totalRound,
      epsilon,
      delta,
      radiusMin: Math.min(...effectiveRadius),
      radiusMax: Math.max(...effectiveRadius),
      sigmaMin: Math.min(...sigmas),
      sigmaMax: Math.max(...sigmas),
    });

    const noisyProgress = await privacy.addOptimalNoise(
      weightsProgress,
      epsilon,
      delta,
      effectiveRadius,
    );
    try {
      ret = previousEpochWeights.add(noisyProgress);
    } finally {
      weightsProgress.dispose();
      noisyProgress.dispose();
      if (previous === undefined) previousEpochWeights.dispose();
    }
  }
  return ret;
}
