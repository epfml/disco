import {
  async_iterator,
  data,
  BatchLogs,
  EpochLogs,
  Logger,
  Memory,
  Model,
  Task,
  TrainingInformation,
} from "../index.js";
import { client as clients, ConsoleLogger, EmptyMemory } from "../index.js";
import type { Aggregator } from "../aggregator/index.js";
import { getAggregator } from "../aggregator/index.js";
import { enumerate, split } from "../utils/async_iterator.js";
import { EventEmitter } from "../utils/event_emitter.js";

import { RoundLogs, Trainer } from "./trainer.js";

interface DiscoConfig {
  scheme: TrainingInformation["scheme"];
  logger: Logger;
  memory: Memory;
}

export type RoundStatus =
  "Waiting for more participants" |
  "Retrieving peers' information" |
  "Updating the model with other participants' models" |
  "Training the model on the data you connected"

/**
 * Top-level class handling distributed training from a client's perspective. It is meant to be
 * a convenient object providing a reduced yet complete API that wraps model training,
 * communication with nodes, logs and model memory.
 */
export class Disco extends EventEmitter<{'status': RoundStatus}>{
  public readonly trainer: Trainer;
  readonly #client: clients.Client;
  readonly #logger: Logger;
  // small helper to avoid keeping Task & Memory around
  readonly #updateWorkingModel: (_: Model) => Promise<void>;

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
    const { scheme, logger, memory } = {
      scheme: task.trainingInformation.scheme,
      logger: new ConsoleLogger(),
      memory: new EmptyMemory(),
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
    this.trainer = new Trainer(task, client)
    // Simply propagate the training status events emitted by the client
    this.#client.on('status', status => this.emit('status', status))

    this.#updateWorkingModel = () =>
      memory.updateWorkingModel(
        {
          type: "working",
          taskID: task.id,
          name: task.trainingInformation.modelID,
          tensorBackend: task.trainingInformation.tensorBackend,
        },
        this.trainer.model,
      );
  }

  /** Train on dataset, yielding logs of every round. */
  async *trainByRound(dataTuple: data.DataSplit): AsyncGenerator<RoundLogs> {
    for await (const round of this.train(dataTuple)) {
      const [roundGen, roundLogs] = async_iterator.split(round);
      for await (const epoch of roundGen) for await (const _ of epoch);
      yield await roundLogs;
    }
  }

  /** Train on dataset, yielding logs of every epoch. */
  async *trainByEpoch(dataTuple: data.DataSplit): AsyncGenerator<EpochLogs> {
    for await (const round of this.train(dataTuple)) {
      for await (const epoch of round) {
        const [epochGen, epochLogs] = async_iterator.split(epoch);
        for await (const _ of epochGen);
        yield await epochLogs;
      }
    }
  }

  /** Train on dataset, yielding logs of every batch. */
  async *trainByBatch(dataTuple: data.DataSplit): AsyncGenerator<BatchLogs> {
    for await (const round of this.train(dataTuple))
      for await (const epoch of round) yield* epoch;
  }

  /** Run whole train on dataset. */
  async trainFully(dataTuple: data.DataSplit): Promise<void> {
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
    dataTuple: data.DataSplit,
  ): AsyncGenerator<
    AsyncGenerator<AsyncGenerator<BatchLogs, EpochLogs>, RoundLogs>
  > {
    this.#logger.success("Training started");

    const trainData = dataTuple.train.preprocess().batch();
    const validationData =
      dataTuple.validation?.preprocess().batch() ?? trainData;
    // the client fetches the latest weights upon connection
    this.trainer.model = await this.#client.connect();

    for await (const [round, epochs] of enumerate(
      this.trainer.train(trainData.dataset, validationData.dataset),
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

      await this.#updateWorkingModel(this.trainer.model);
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
