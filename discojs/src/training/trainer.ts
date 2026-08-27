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
  readonly #validationMode: "before" | "after" | "both";
  // Map of weight Index and weight update
  #weightNormHistory: WeightNormHistory = List();
  #previousRoundWeights?: WeightsContainer;

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
    this.#validationMode = task.trainingInformation.validationMode ?? "before";
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
          ? this.#runRoundsByEpoch(dataset, validationDataset)
          : this.#runRoundsByIteration(dataset, validationDataset);
      yield* this.#training;
    } finally {
      this.#training = undefined;
    }
  }

  /**
   * Runs epoch-based training, aggregating after `roundDuration` complete
   * passes over the training dataset until the configured epochs are reached.
   */
  async *#runRoundsByEpoch(
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

      yield this.#runRoundByEpoch(
        dataset,
        this.#shouldValidateBeforeAggregation()
          ? roundValidationDataset
          : undefined,
        this.#shouldValidateAfterAggregation()
          ? roundValidationDataset
          : undefined,
        totalRound,
      );
    }
  }

  /**
   * Runs iteration-based training, aggregating after `roundIterations`
   * batches while preserving the dataset iterator between rounds. A new
   * iterator is created only when the next configured epoch begins.
   */
  async *#runRoundsByIteration(
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
      while (next.done !== true) {
        await this.#client.onRoundBeginCommunication();

        this.#previousRoundWeights = new WeightsContainer(
          this.model.weights.weights.map((t) => t.clone()),
        );

        let firstBatch: Batched<DataFormat.ModelEncoded[D]> | undefined =
          next.value;
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

        yield this.#runRoundByIteration(
          prefixedIterator,
          this.#roundIterations,
          this.#shouldValidateBeforeAggregation()
            ? roundValidationDataset
            : undefined,
          this.#shouldValidateAfterAggregation()
            ? roundValidationDataset
            : undefined,
          totalRound,
          (roundDone) => (done = roundDone),
        );

        round++;
        if (done) break;
        next = await trainingIterator.next();
      }
    }
  }

  /**
   * Trains one epoch-based round by making `roundDuration` complete passes
   * over the dataset, then exchanges weights and returns the round metrics.
   */
  async *#runRoundByEpoch(
    dataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    preAggregationValidationDataset:
      | Dataset<Batched<DataFormat.ModelEncoded[D]>>
      | undefined,
    postAggregationValidationDataset:
      | Dataset<Batched<DataFormat.ModelEncoded[D]>>
      | undefined,
    totalRound: number,
  ): AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs> {
    let epochsLogs = List<EpochLogs>();

    debug("Run round");

    // Before starting the training, get the validation of global model
    const validation =
      preAggregationValidationDataset !== undefined
        ? await this.model.evaluate(preAggregationValidationDataset)
        : undefined;

    for (let epoch = 0; epoch < this.#roundDuration; epoch++) {
      const [gen, epochLogs] = async_iterator.split(
        this.model.train(dataset, preAggregationValidationDataset),
      );

      yield gen;
      epochsLogs = epochsLogs.push(await epochLogs);
    }

    const participants = this.#client.nbOfParticipants;
    const postAggregationValidation = await this.#finishRoundCommunication(
      totalRound,
      postAggregationValidationDataset,
    );

    return {
      epochs: epochsLogs,
      participants,
      preRoundValidation: validation,
      postAggregationValidation,
    };
  }

  /**
   * Trains one iteration-based round by consuming at most `maxBatchCount`
   * batches from the supplied iterator without rewinding it, then exchanges
   * weights and returns the round metrics.
   */
  async *#runRoundByIteration(
    datasetIterator: AsyncIterator<Batched<DataFormat.ModelEncoded[D]>>,
    maxBatchCount: number,
    preAggregationValidationDataset:
      | Dataset<Batched<DataFormat.ModelEncoded[D]>>
      | undefined,
    postAggregationValidationDataset:
      | Dataset<Batched<DataFormat.ModelEncoded[D]>>
      | undefined,
    totalRound: number,
    setDone?: (done: boolean) => void,
  ): AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs> {
    let epochsLogs = List<EpochLogs>();

    debug("Run iteration-based round");

    const validation =
      preAggregationValidationDataset !== undefined
        ? await this.model.evaluate(preAggregationValidationDataset)
        : undefined;

    const model = this.model as unknown as IterationTrainableTextModel;
    if (typeof model.trainNextBatches !== "function")
      throw new Error("model does not support iteration-based training");

    const [gen, epochLogs] = async_iterator.split(
      model.trainNextBatches(
        datasetIterator as AsyncIterator<
          Batched<DataFormat.ModelEncoded["text"]>
        >,
        maxBatchCount,
        preAggregationValidationDataset as
          | Dataset<Batched<DataFormat.ModelEncoded["text"]>>
          | undefined,
        setDone,
      ),
    );

    yield gen;
    epochsLogs = epochsLogs.push(await epochLogs);

    const participants = this.#client.nbOfParticipants;
    const postAggregationValidation = await this.#finishRoundCommunication(
      totalRound,
      postAggregationValidationDataset,
    );

    return {
      epochs: epochsLogs,
      participants,
      preRoundValidation: validation,
      postAggregationValidation,
    };
  }

  #shouldValidateBeforeAggregation(): boolean {
    return this.#validationMode !== "after";
  }

  #shouldValidateAfterAggregation(): boolean {
    return this.#validationMode !== "before";
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

      return validationDataset !== undefined
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
