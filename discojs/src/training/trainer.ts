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
import * as async_iterator from "../utils/async_iterator.js";

export interface RoundLogs {
  epochs: List<EpochLogs>;
  participants: number;
  preRoundValidation?: ValidationMetrics;
}

/** List of weight update norms */
export type WeightNormHistory = List<List<number>>;

function appendWeightHistory(weightNormHistory: WeightNormHistory, wc: number[]){
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
  // Map of weight Index and weight update
  #weightNormHistory : WeightNormHistory = List();
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
		if ("privacy" in task.trainingInformation)
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
    dataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>,
    void
  > {
    if (this.#training !== undefined)
      throw new Error(
        "training already running, stop it before launching a new one",
      );

    try {
      this.#training = this.#runRounds(dataset, validationDataset);
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
    for (let round = 0; round < totalRound; round++) {

      await this.#client.onRoundBeginCommunication();

      // Store the clean weight before starting the communication
      this.#previousRoundWeights = new WeightsContainer(this.model.weights.weights.map(t => t.clone()));

      yield this.#runRound(dataset, validationDataset);

      let roundWeights = this.model.weights;

      // Apply differential privacy before sharing the weight updates with other nodes
      if (this.#privacy !== undefined){
        const roundUpdate = roundWeights.sub(this.#previousRoundWeights);
        const updateNorm = await Promise.all(
          roundUpdate.weights.map(privacy.frobeniusNorm)
        );
        this.#weightNormHistory = appendWeightHistory(this.#weightNormHistory, updateNorm);
        
        roundWeights = await applyOptimalPrivacy(
          this.#previousRoundWeights,
          roundWeights,
          this.#privacy,
          this.#weightNormHistory,
          totalRound,
        )
      }
      // Get the updated weights
      const networkWeights = await this.#client.onRoundEndCommunication(roundWeights);
      
      // Update the local weights
      this.model.weights = networkWeights;
    }
  }

  async *#runRound(
    dataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs> {
    let epochsLogs = List<EpochLogs>();

    // Before starting the training, get the validation of global model
    const validation = validationDataset !== undefined ? await this.model.evaluate(validationDataset) : undefined;

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
		ret = previousRoundWeights.add(
			await privacy.clipNorm(
				weightsProgress,
				Repeat(options.byzantineFaultTolerance.clippingRadius)
					.take(weightsProgress.weights.length)
					.toArray(),
			),
		);
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

		ret = previousEpochWeights.add(
			await privacy.addOptimalNoise(
				weightsProgress,
				epsilon,
				delta,
				effectiveRadius,
			),
		);
	}
	return ret;
}
