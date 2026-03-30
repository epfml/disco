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
} from "../index.js";
import type { Aggregator } from "../aggregator/index.js";
import { getAggregator } from "../aggregator/index.js";
import { enumerate, split } from "../utils/async_iterator.js";
import { EventEmitter } from "../utils/event_emitter.js";

import { RoundLogs, Trainer } from "./trainer.js";

interface DiscoConfig<N extends Network> {
  scheme: N;
  logger: Logger;

  /**
   * keep preprocessed dataset in memory while training
   *
   * `Dataset` is cached anyway but this cache can get evicted.
   * if your system has enough memory to keep the whole preprocessed `Dataset` around,
   * you can switch this on to only do it once, trading memory for speed.
   */
  preprocessOnce: boolean;
}

export type RoundStatus = 'not enough participants' | // Server notification to wait for more participants
  'updating model' | // fetching/aggregating local updates into a global model
  'local training' | // Training the model locally
  'connecting to peers' // for decentralized only, fetch the server's list of participating peers

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
    const { scheme, logger, preprocessOnce } = {
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
  ): AsyncGenerator<BatchLogs> {
    for await (const round of this.train(dataset))
      for await (const epoch of round) yield* epoch;
  }

  /** Run whole train on dataset. */
  async trainFully(dataset: Dataset<DataFormat.Raw[D]>): Promise<void> {
    for await (const round of this.train(dataset))
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
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>
  > {
    this.#logger.success("Training started");

    // the client fetches the latest weights upon connection
    // TODO unsafe cast
    this.trainer.model = (await this.#client.connect()) as Model<D>;

    const [trainingDataset, validationDataset] =
      await this.#preprocessSplitAndBatch(dataset);

    for await (const [round, epochs] of enumerate(
      this.trainer.train(trainingDataset, validationDataset),
    )) {
      yield async function* (this: Disco<D, N>) {
        const [gen, returnedRoundLogs] = split(epochs);
        for await (const [epoch, batches] of enumerate(gen)) {
          const [gen, returnedEpochLogs] = split(batches);

          yield gen;
          const epochLogs = await returnedEpochLogs;

          this.#logger.success(
            [
              `Round: ${round}`,
              `  Epoch: ${epoch}`,
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

        return await returnedRoundLogs;
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

  async #preprocessSplitAndBatch(
    dataset: Dataset<DataFormat.Raw[D]>,
  ): Promise<
    [
      Dataset<Batched<DataFormat.ModelEncoded[D]>>,
      Dataset<Batched<DataFormat.ModelEncoded[D]>> | undefined,
    ]
  > {
    const { batchSize, validationSplit } = this.#task.trainingInformation;

    if (validationSplit === 0){
      if (this.#task.dataType === "tabular"){
        const rows = await arrayFromAsync(dataset as Dataset<DataFormat.Raw["tabular"]>);
        const inputColumns = this.#task.trainingInformation.inputColumns;

        const stats = processing.computeStandardizationStats(rows, inputColumns);
        this.trainer.model.metadata = {
          tabularStandardization: stats,
        };

        let preprocessed = processing.preprocess(
          this.#task,
          dataset,
          this.trainer.model.metadata,
        );
        return [preprocessed.batch(batchSize).cached(), undefined];
      }
      // If task datatype is not tabular
      let preprocessed = processing.preprocess(this.#task, dataset);

      preprocessed = (
        this.#preprocessOnce
          ? new Dataset(await arrayFromAsync(preprocessed))
          : preprocessed
      )
      return [preprocessed.batch(batchSize).cached(), undefined];
    }

    // If training/validation splitting ratio is defined
    const [training, validation] = dataset.split(validationSplit);

    if (this.#task.dataType == "tabular"){
      const trainingRows = await arrayFromAsync(training as Dataset<DataFormat.Raw["tabular"]>);
      const inputColumns = this.#task.trainingInformation.inputColumns;
      const stats = processing.computeStandardizationStats(trainingRows, inputColumns);

      this.trainer.model.metadata = {
        tabularStandardization: stats,
      };

      let preprocessedTraining = processing.preprocess(this.#task, training, this.trainer.model.metadata);
      let preprocessedValidation = processing.preprocess(this.#task, validation, this.trainer.model.metadata);
      preprocessedTraining = this.#preprocessOnce
          ? new Dataset(await arrayFromAsync(preprocessedTraining))
          : preprocessedTraining;
      
      preprocessedValidation = this.#preprocessOnce
          ? new Dataset(await arrayFromAsync(preprocessedValidation))
          : preprocessedValidation;

      return [
        preprocessedTraining.batch(batchSize).cached(),
        preprocessedValidation.batch(batchSize).cached(),
      ];      
    }
    
    // if task datatype is not tabular
    let preprocessedTraining = processing.preprocess(this.#task, training);
    let preprocessedValidation = processing.preprocess(this.#task, validation);

    preprocessedTraining = this.#preprocessOnce
        ? new Dataset(await arrayFromAsync(preprocessedTraining))
        : preprocessedTraining;
    
    preprocessedValidation = this.#preprocessOnce
        ? new Dataset(await arrayFromAsync(preprocessedValidation))
        : preprocessedValidation;

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
