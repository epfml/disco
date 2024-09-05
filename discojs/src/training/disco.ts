import {
  async_iterator,
  client as clients,
  BatchLogs,
  ConsoleLogger,
  EpochLogs,
  Logger,
  Task,
  TrainingInformation,
  processing,
  Dataset,
} from "../index.js";
import type {
  Batched,
  TypedBatchedPreprocessedLabeledDataset,
  TypedLabeledDataset,
} from "../index.js";
import type { Aggregator } from "../aggregator/index.js";
import { getAggregator } from "../aggregator/index.js";
import { enumerate, split } from "../utils/async_iterator.js";
import { EventEmitter } from "../utils/event_emitter.js";

import { RoundLogs, Trainer } from "./trainer.js";

interface DiscoConfig {
  scheme: TrainingInformation["scheme"];
  logger: Logger;

  // keep preprocessed dataset in memory while training
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
export class Disco extends EventEmitter<{'status': RoundStatus}>{
  public readonly trainer: Trainer;
  readonly #client: clients.Client;
  readonly #logger: Logger;
  readonly #task: Task;
  readonly #preprocessOnce: boolean;

  /**
   * Connect to the given task and get ready to train.
   * 
   * @param task 
   * @param clientConfig client to connect with or parameters on how to create one.
   * @param config the DiscoConfig
   */
  constructor(task: Task,
    clientConfig: clients.Client | URL | { aggregator: Aggregator; url: URL },
    config: Partial<DiscoConfig>
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
    this.trainer = new Trainer(task, client)
    // Simply propagate the training status events emitted by the client
    this.#client.on('status', status => this.emit('status', status))
  }

  /** Train on dataset, yielding logs of every round. */
  async *trainByRound(dataset: TypedLabeledDataset): AsyncGenerator<RoundLogs> {
    for await (const round of this.train(dataset)) {
      const [roundGen, roundLogs] = async_iterator.split(round);
      for await (const epoch of roundGen) for await (const _ of epoch);
      yield await roundLogs;
    }
  }

  /** Train on dataset, yielding logs of every epoch. */
  async *trainByEpoch(dataset: TypedLabeledDataset): AsyncGenerator<EpochLogs> {
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
    dataTuple: TypedLabeledDataset,
  ): AsyncGenerator<BatchLogs> {
    for await (const round of this.train(dataTuple))
      for await (const epoch of round) yield* epoch;
  }

  /** Run whole train on dataset. */
  async trainFully(dataTuple: TypedLabeledDataset): Promise<void> {
    for await (const round of this.train(dataTuple))
      for await (const epoch of round) for await (const _ of epoch);
  }

  /**
   * Train on dataset, yield the nested steps.
   *
   * Don't forget to await the yielded generator otherwise nothing will progress.
   * If you don't care about the whole process, use one of the other train methods.
   **/
  async *train(
    dataset: TypedLabeledDataset,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>
  > {
    this.#logger.success("Training started");

    const [trainingDataset, validationDataset] =
      await this.#preprocessSplitAndBatch(dataset);

    // the client fetches the latest weights upon connection
    this.trainer.model = await this.#client.connect();

    for await (const [round, epochs] of enumerate(
      this.trainer.train(trainingDataset, validationDataset),
    )) {
      yield async function* (this: Disco) {
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
    dataset: TypedLabeledDataset,
  ): Promise<
    [
      TypedBatchedPreprocessedLabeledDataset,
      TypedBatchedPreprocessedLabeledDataset,
    ]
  > {
    const splitAndBatch = async <T>(
      d: Dataset<T>,
    ): Promise<[Dataset<Batched<T>>, Dataset<Batched<T>>]> => {
      const [training, validation] = (
        this.#preprocessOnce ? new Dataset(await arrayFromAsync(d)) : d
      ).split(validationSplit);

      return [
        training.batch(batchSize).cached(),
        validation.batch(batchSize).cached(),
      ];
    };

    const preprocessed = await processing.preprocess(this.#task, dataset);

    const { batchSize, validationSplit } = this.#task.trainingInformation;
    switch (preprocessed[0]) {
      case "image": {
        const [training, validation] = await splitAndBatch(preprocessed[1]);
        return [
          ["image", training],
          ["image", validation],
        ];
      }
      case "tabular": {
        const [training, validation] = await splitAndBatch(preprocessed[1]);
        return [
          ["tabular", training],
          ["tabular", validation],
        ];
      }
      case "text": {
        const [training, validation] = await splitAndBatch(preprocessed[1]);
        return [
          ["text", training],
          ["text", validation],
        ];
      }
    }
  }
}

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}
