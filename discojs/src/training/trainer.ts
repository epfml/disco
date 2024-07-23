import * as tf from "@tensorflow/tfjs";
import { List } from "immutable";

import type {
  BatchLogs,
  EpochLogs,
  Model,
  Task,
  WeightsContainer,
} from "../index.js";
import { privacy } from "../index.js";
import { Client } from "../client/index.js";
import * as async_iterator from "../utils/async_iterator.js";

export interface RoundLogs {
  epochs: List<EpochLogs>;
  participants: number;
}

/** Train a model and exchange with others **/
export class Trainer {
  readonly #client: Client;
  readonly #roundDuration: number;
  readonly #epochs: number;
  readonly #privacy: Task["trainingInformation"]["privacy"];

  #training?: AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  >;

  constructor(
    task: Task,
    public readonly model: Model,
    client: Client,
  ) {
    this.#client = client;
    this.#roundDuration = task.trainingInformation.roundDuration;
    this.#epochs = task.trainingInformation.epochs;
    this.#privacy = task.trainingInformation.privacy;

    if (!Number.isInteger(this.#epochs / this.#roundDuration))
      throw new Error(
        `round duration ${this.#roundDuration} doesn't divide number of epochs ${this.#epochs}`,
      );
  }

  async stopTraining(): Promise<void> {
    await this.#training?.return();
  }

  async *train(
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  > {
    if (this.#training !== undefined)
      throw new Error(
        "training already running, stop it before launching a new one",
      );

    try {
      this.#training = this.#runRounds(dataset, valDataset);
      yield* this.#training;
    } finally {
      this.#training = undefined;
    }
  }

  async *#runRounds(
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  > {
    const totalRound = Math.trunc(this.#epochs / this.#roundDuration);
    let previousRoundWeights: WeightsContainer | undefined;
    for (let round = 0; round < totalRound; round++) {
      await this.#client.onRoundBeginCommunication(this.model.weights, round);

      yield this.#runRound(dataset, valDataset);

      let localWeights = this.model.weights;
      if (this.#privacy !== undefined)
        localWeights = await applyPrivacy(
          previousRoundWeights,
          localWeights,
          this.#privacy,
        );

      const networkWeights = await this.#client.onRoundEndCommunication(
        localWeights,
        round,
      );

      this.model.weights = previousRoundWeights = networkWeights;
    }
  }

  async *#runRound(
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>,
  ): AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs> {
    let epochsLogs = List<EpochLogs>();
    for (let epoch = 0; epoch < this.#roundDuration; epoch++) {
      const [gen, epochLogs] = async_iterator.split(
        this.model.train(dataset, valDataset),
      );

      yield gen;
      epochsLogs = epochsLogs.push(await epochLogs);
    }

    return {
      epochs: epochsLogs,
      participants: this.#client.nbOfParticipants,
    };
  }
}

async function applyPrivacy(
  previous: WeightsContainer | undefined,
  current: WeightsContainer,
  options: Exclude<Task["trainingInformation"]["privacy"], undefined>,
): Promise<WeightsContainer> {
  let ret = current;

  if (options.clippingRadius !== undefined) {
    const previousRoundWeights = previous ?? current.map((w) => tf.zerosLike(w));
    const weightsProgress = current.sub(previousRoundWeights);
    ret = previousRoundWeights.add(
      await privacy.clipNorm(weightsProgress, options.clippingRadius),
    );
  }

  if (options.noiseScale !== undefined)
    ret = privacy.addNoise(ret, options.noiseScale);

  return ret;
}
