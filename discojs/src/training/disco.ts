import {
  async_iterator,
  client as clients,
  BatchLogs,
  ConsoleLogger,
  EpochLogs,
  Logger,
  processing,
  Dataset,
} from "../index.js";
import type {
  Batched,
  DataFormat,
  DataType,
  Model,
  Network,
  Task,
  GoldfishLossConfig,
} from "../index.js";
import type { Aggregator } from "../aggregator/index.js";
import { getAggregator } from "../aggregator/index.js";
import { enumerate, split } from "../utils/async_iterator.js";
import { EventEmitter } from "../utils/event_emitter.js";

import createDebug from "debug"

import { RoundLogs, Trainer } from "./trainer.js";

const debug = createDebug("discojs:training:disco");

interface DiscoConfig<N extends Network> {
  scheme: N;
  logger: Logger;
  debugLabel?: string;

  /**
   * keep preprocessed dataset in memory while training
   *
   * `Dataset` is cached anyway but this cache can get evicted.
   * if your system has enough memory to keep the whole preprocessed `Dataset` around,
   * you can switch this on to only do it once, trading memory for speed.
   */
  preprocessOnce: boolean;
}

export type SummaryLogs = {
  round: number,
  epoch: number,
  trainingLoss: number,
  trainingAccuracy: number,
  peakMemory: number,
  epochTime: number,
  roundValidationLoss?: number,
  roundValidationAccuracy?: number,
  validationLoss?: number,
  validationAccuracy?: number
}

export type RoundStatus = 'not enough participants' | // Server notification to wait for more participants
  'updating model' | // fetching/aggregating local updates into a global model
  'local training' | // Training the model locally
  'connecting to peers' // for decentralized only, fetch the server's list of participating peers

function buildSummaryLog(roundNum: number, epochNum: number, roundLogs: RoundLogs, epochLogs: EpochLogs): SummaryLogs {
  return {
      round: roundNum,
      epoch: epochNum,
      trainingLoss: epochLogs.training.loss,
      trainingAccuracy: epochLogs.training.accuracy,
      peakMemory: epochLogs.peakMemory,
      epochTime: epochLogs.epochTime,
      roundValidationLoss: roundLogs.preRoundValidation?.loss,
      roundValidationAccuracy: roundLogs.preRoundValidation?.accuracy,
      validationLoss: epochLogs.validation?.loss,
      validationAccuracy: epochLogs.validation?.accuracy,
    }
}

/**
 * Top-level class handling distributed training from a client's perspective. It is meant to be
 * a convenient object providing a reduced yet complete API that wraps model training and
 * communication with nodes.
 */
export class Disco<D extends DataType, N extends Network> extends EventEmitter<{
  status: RoundStatus;
  participants: number
}> {
  public readonly trainer: Trainer<D, N>;
  readonly #client: clients.Client<N>;
  readonly #logger: Logger;
  readonly #task: Task<D, N>;
  readonly #preprocessOnce: boolean;
  readonly #debugLabel?: string;

  /**
   * Connect to the given task and get ready to train.
   *
   * @param task
   * @param clientConfig client to connect with or parameters on how to create one.
   * @param config the DiscoConfig
   */
  constructor(
    task: Task<D, N>,
    clientConfig: clients.Client<N> | URL | { aggregator: Aggregator; url: URL },
    config: Partial<DiscoConfig<N>>,
  ) {
    super();
    const { scheme, logger, preprocessOnce, debugLabel } = {
      // cast as typescript is bad at generic
      scheme: task.trainingInformation.scheme as N,
      logger: new ConsoleLogger(),
      preprocessOnce: false,
      ...config,
    };

    let client;
    if (clientConfig instanceof clients.Client) {
      client = clientConfig;
    } else {
      let url, aggregator;
      if (clientConfig instanceof URL) {
        url = clientConfig;
        aggregator = getAggregator(task, { scheme });
      } else {
        ({ url, aggregator } = clientConfig);
      }
      client = clients.getClient(scheme, url, task, aggregator);
    }
    if (client.task !== task)
      throw new Error("client not setup for given task");

    this.#logger = logger;
    this.#preprocessOnce = preprocessOnce;
    this.#debugLabel = debugLabel;
    this.#client = client;
    this.#task = task;
    this.trainer = new Trainer(task, client);
    // Simply propagate the training status events emitted by the client
    this.#client.on("status", (status) => this.emit("status", status));
    this.#client.on("participants", (nbParticipants) => this.emit("participants", nbParticipants));
  }

  /** Train on dataset, yielding logs of every round. */
  async *trainByRound(
    dataset: Dataset<DataFormat.Raw[D]>,
  ): AsyncGenerator<RoundLogs> {
    for await (const round of this.train(dataset)) {
      const [roundGen, roundLogs] = async_iterator.split(round);
      for await (const epoch of roundGen) for await (const _ of epoch);
      yield await roundLogs;
    }
  }

  /** Train on dataset, yielding logs of every epoch. */
  async *trainByEpoch(
    dataset: Dataset<DataFormat.Raw[D]>,
  ): AsyncGenerator<EpochLogs> {
    for await (const round of this.train(dataset)) {
      for await (const epoch of round) {
        const [epochGen, epochLogs] = async_iterator.split(epoch);
        for await (const _ of epochGen);
        yield await epochLogs;
      }
    }
  }

  /** Train on dataset, yielding logs of every batch. */
  async *trainByBatch(
    dataset: Dataset<DataFormat.Raw[D]>,
    validationDataset?: Dataset<DataFormat.Raw[D]>,
  ): AsyncGenerator<BatchLogs> {
    for await (const round of this.train(dataset, validationDataset))
      for await (const epoch of round) yield* epoch;
  }

  /** Train on dataset, yielding summary logs */  
  async *trainSummary(
    dataset: Dataset<DataFormat.Raw[D]>,
    validationDataset?: Dataset<DataFormat.Raw[D]>,
  ): AsyncGenerator<SummaryLogs> {
    for await (const [roundNum, round] of enumerate(this.train(dataset, validationDataset))) {
      const [roundGen, roundLogsPromise] = async_iterator.split(round);

      const epochResults: Array<{epochNum: number; epochLogs: EpochLogs}> = [];

      debug("Starting round %d", roundNum)

      for await (const [epochNum, epoch] of enumerate(roundGen)) {
        const [epochGen, epochLogsPromise] = async_iterator.split(epoch);
        for await (const _ of epochGen);
        const epochLogs = await epochLogsPromise;

        epochResults.push({ epochNum, epochLogs });
      }

      const roundLogs = await roundLogsPromise;

      for (const {epochNum, epochLogs} of epochResults) {
        yield buildSummaryLog(roundNum, epochNum, roundLogs, epochLogs);
      }
    }
  }

  /** Run whole train on dataset. */
  async trainFully(dataset: Dataset<DataFormat.Raw[D]>, validationDataset?: Dataset<DataFormat.Raw[D]>): Promise<void> {
    for await (const round of this.train(dataset, validationDataset))
      for await (const epoch of round) for await (const _ of epoch);
  }

  /**
   * Train on dataset, yield the nested steps.
   *
   * Don't forget to await the yielded generator otherwise nothing will progress.
   * If you don't care about the whole process, use one of the other train methods.
   **/
  async *train(
    dataset: Dataset<DataFormat.Raw[D]>,
    validationDataset?: Dataset<DataFormat.Raw[D]>,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>
  > {
    this.#logger.success("Training started");

    const [trainingDataset, validationDataset_] =
      validationDataset !== undefined
        ? await this.#preprocessDatasets(dataset, validationDataset)
        : await this.#preprocessSplitAndBatch(dataset);

    // the client fetches the latest weights upon connection
    // TODO unsafe cast
    debug("Connecting to client and fetching initial model...");
    this.trainer.model = (await this.#client.connect()) as Model<D>;
    this.#setModelDebugLabel(this.trainer.model);
    this.#setModelTrainingOptions(this.trainer.model);
    debug("Initial model fetched successfully");
    if (this.trainer.model === null) {
      debug(`No pre-trained model provided for client, initializing randomly...`);
    }

    for await (const [roundNum, round] of enumerate(
      this.trainer.train(trainingDataset, validationDataset_),
    )) {
      yield async function* (this: Disco<D, N>) {
        const [roundGen, roundLogsPromise] = split(round);
        const epochResults: Array<{epochNum: number; epochLogs: EpochLogs}> = []; 

        for await (const [epochNum, epoch] of enumerate(roundGen)) {
          const [epochGen, epochLogsPromise] = split(epoch);

          yield epochGen;
          const epochLogs = await epochLogsPromise;

          epochResults.push({ epochNum, epochLogs });
        }

        const roundLogs = await roundLogsPromise;
        this.#logger.success(
          [
            `Round: ${roundNum}`,
            `Initial round loss: ${roundLogs.preRoundValidation?.loss}`,
            `Initial round accuracy: ${roundLogs.preRoundValidation?.accuracy}`,
          ].join("\n"),
        );

        for (const {epochNum, epochLogs} of epochResults){
          this.#logger.success(
            [
              `Round: ${roundNum}`,
              `  Epoch: ${epochNum}`,
              `    Training loss: ${epochLogs.training.loss}`,
              `    Training accuracy: ${epochLogs.training.accuracy}`,
              `    Peak memory: ${epochLogs.peakMemory}`,
              epochLogs.validation !== undefined
                ? `    Validation loss: ${epochLogs.validation.loss}`
                : "",
              epochLogs.validation !== undefined
                ? `    Validation accuracy: ${epochLogs.validation.accuracy}`
                : "",
            ].join("\n"),
          );
        }

        return roundLogs;
      }.bind(this)();
    }
    this.#logger.success("Training finished");
  }

  /**
   * Completely stops the ongoing training instance.
   */
  async close(): Promise<void> {
    await this.#client.disconnect();
  }

  #setModelDebugLabel(model: Model<D>): void {
    if (this.#debugLabel === undefined) return;

    const labeledModel = model as Model<D> & {
      setDebugLabel?: (label: string) => void;
    };

    labeledModel.setDebugLabel?.(this.#debugLabel);
  }

  #setModelTrainingOptions(model: Model<D>): void {
    if (this.#task.dataType !== "text") return;

    const configurableModel = model as Model<D> & {
      setGoldfishLoss?: (config: GoldfishLossConfig | undefined) => void;
    };

    configurableModel.setGoldfishLoss?.(this.#task.trainingInformation.goldfishLoss);
  }

  async #preprocessSplitAndBatch(
    dataset: Dataset<DataFormat.Raw[D]>,
  ): Promise<
    [
      Dataset<Batched<DataFormat.ModelEncoded[D]>>,
      Dataset<Batched<DataFormat.ModelEncoded[D]>> | undefined,
    ]
  > {
    const { batchSize, validationSplit } = this.#task.trainingInformation;

    let preprocessed = processing.preprocess(this.#task, dataset);

    preprocessed = (
      this.#preprocessOnce
        ? new Dataset(await arrayFromAsync(preprocessed))
        : preprocessed
    )
    if (validationSplit === 0) return [preprocessed.batch(batchSize).cached(), undefined];
    
    const [training, validation] = preprocessed.split(validationSplit);

    return [
      training.batch(batchSize).cached(),
      validation.batch(batchSize).cached(),
    ];
  }

  async #preprocessDatasets(
    trainingDataset: Dataset<DataFormat.Raw[D]>,
    validationDataset: Dataset<DataFormat.Raw[D]>,
  ): Promise<
    [
      Dataset<Batched<DataFormat.ModelEncoded[D]>>,
      Dataset<Batched<DataFormat.ModelEncoded[D]>> | undefined,
    ]
  > {
    const { batchSize } = this.#task.trainingInformation;

    let preprocessedTraining = processing.preprocess(this.#task, trainingDataset);
    let preprocessedValidation = processing.preprocess(this.#task, validationDataset);

    if (this.#preprocessOnce) {
      preprocessedTraining = new Dataset(await arrayFromAsync(preprocessedTraining));
      preprocessedValidation = new Dataset(await arrayFromAsync(preprocessedValidation));
    }

    return [
      preprocessedTraining.batch(batchSize).cached(),
      preprocessedValidation.batch(batchSize).cached(),
    ];
  }
}

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}
