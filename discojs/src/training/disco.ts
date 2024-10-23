import {
  async_iterator,
  client as clients,
  BatchLogs,
  ConsoleLogger,
  EpochLogs,
  Logger,
  TrainingInformation,
  processing,
  Dataset,
} from "../index.js";
import type {
  Batched,
  DataFormat,
  DataType,
  Model,
  Task,
} from "../index.js";
import type { Aggregator } from "../aggregator/index.js";
import { getAggregator } from "../aggregator/index.js";
import { enumerate, split } from "../utils/async_iterator.js";
import { EventEmitter } from "../utils/event_emitter.js";

import { RoundLogs, Trainer } from "./trainer.js";

interface DiscoConfig {
  scheme: TrainingInformation<DataType>["scheme"];
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
export class Disco<D extends DataType> extends EventEmitter<{
  status: RoundStatus;
}> {
  public readonly trainer: Trainer<D>;
  readonly #client: clients.Client;
  readonly #logger: Logger;
  readonly #task: Task<D>;
  readonly #preprocessOnce: boolean;

  /**
   * Connect to the given task and get ready to train.
   *
   * @param task
   * @param clientConfig client to connect with or parameters on how to create one.
   * @param config the DiscoConfig
   */
  constructor(
    task: Task<D>,
    clientConfig: clients.Client | URL | { aggregator: Aggregator; url: URL },
    config: Partial<DiscoConfig>,
  ) {
    super();
    const { scheme, logger, preprocessOnce } = {
      scheme: task.trainingInformation.scheme,
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

    const [trainingDataset, validationDataset] =
      await this.#preprocessSplitAndBatch(dataset);

    // the client fetches the latest weights upon connection
    // TODO unsafe cast
    this.trainer.model = (await this.#client.connect()) as Model<D>;

    for await (const [round, epochs] of enumerate(
      this.trainer.train(trainingDataset, validationDataset),
    )) {
      yield async function* (this: Disco<D>) {
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
      Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    ]
  > {
    const { batchSize, validationSplit } = this.#task.trainingInformation;

    const preprocessed = await processing.preprocess(this.#task, dataset);

    const [training, validation] = (
      this.#preprocessOnce
        ? new Dataset(await arrayFromAsync(preprocessed))
        : preprocessed
    ).split(validationSplit);

    return [
      training.batch(batchSize).cached(),
      validation.batch(batchSize).cached(),
    ];
  }
}

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}
