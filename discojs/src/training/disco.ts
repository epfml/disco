import {
  async_iterator,
  client as clients,
  BatchLogs,
  ConsoleLogger,
  EpochLogs,
  Logger,
  Task,
  TrainingInformation,
} from "../index.js";
import type { TypedLabeledDataset } from "../index.js";
import type { Aggregator } from "../aggregator/index.js";
import { getAggregator } from "../aggregator/index.js";
import { enumerate, split } from "../utils/async_iterator.js";
import { EventEmitter } from "../utils/event_emitter.js";

import { RoundLogs, Trainer } from "./trainer.js";
import { labeledDatasetToDataSplit } from "../dataset/data/helpers.js";

interface DiscoConfig {
  scheme: TrainingInformation["scheme"];
  logger: Logger;
}

export type RoundStatus = 'NOT ENOUGH PARTICIPANTS' | // Server notification to wait for more participants
  'UPDATING MODEL' | // fetching/aggregating local updates into a global model
  'TRAINING' | // Training the model locally
  'RETRIEVING PEERS' // for decentralized only, fetch the server's list of participating peers

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
    super()
    const { scheme, logger } = {
      scheme: task.trainingInformation.scheme,
      logger: new ConsoleLogger(),
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

    const data = await labeledDatasetToDataSplit(this.#task, dataset);
    const trainData = data.train.preprocess().batch().dataset;
    const validationData =
      data.validation?.preprocess().batch().dataset ?? trainData;
    // the client fetches the latest weights upon connection
    this.trainer.model = await this.#client.connect();

    for await (const [round, epochs] of enumerate(
      this.trainer.train(trainData, validationData),
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
}
