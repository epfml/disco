import { List } from 'immutable'

import { BatchLogs, data, EpochLogs, Logger, Memory, Task, TrainingInformation } from '../index.js'
import { client as clients, EmptyMemory, ConsoleLogger } from '../index.js'
import type { Aggregator } from '../aggregator/index.js'
import { MeanAggregator } from '../aggregator/mean.js'
import { enumerate, split } from '../utils/async_iterator.js'

import type { RoundLogs, Trainer } from './trainer/trainer.js'
import { TrainerBuilder } from './trainer/trainer_builder.js'

export interface DiscoOptions {
  client?: clients.Client
  aggregator?: Aggregator
  url?: string | URL
  scheme?: TrainingInformation['scheme']
  logger?: Logger
  memory?: Memory
}

/**
 * Top-level class handling distributed training from a client's perspective. It is meant to be
 * a convenient object providing a reduced yet complete API that wraps model training,
 * communication with nodes, logs and model memory.
 */
export class Disco {
  public readonly task: Task
  public readonly logger: Logger
  public readonly memory: Memory
  private readonly client: clients.Client
  private readonly trainer: Promise<Trainer>

  constructor (
    task: Task,
    options: DiscoOptions
  ) {
    if (options.scheme === undefined) {
      options.scheme = task.trainingInformation.scheme
    }
    if (options.aggregator === undefined) {
      options.aggregator = new MeanAggregator()
    }
    if (options.client === undefined) {
      if (options.url === undefined) {
        throw new Error('could not determine client from given parameters')
      }

      if (typeof options.url === 'string') {
        options.url = new URL(options.url)
      }
      switch (options.scheme) {
        case 'federated':
          options.client = new clients.federated.FederatedClient(options.url, task, options.aggregator)
          break
        case 'decentralized':
          options.client = new clients.decentralized.DecentralizedClient(options.url, task, options.aggregator)
          break
        case 'local':
          options.client = new clients.Local(options.url, task, options.aggregator)
          break
        default: {
          const _: never = options.scheme
          throw new Error('should never happen')
        }
      }
    }
    if (options.logger === undefined) {
      options.logger = new ConsoleLogger()
    }
    if (options.memory === undefined) {
      options.memory = new EmptyMemory()
    }
    if (options.client.task !== task) {
      throw new Error('client not setup for given task')
    }

    this.task = task
    this.client = options.client
    this.memory = options.memory
    this.logger = options.logger

    const trainerBuilder = new TrainerBuilder(this.memory, this.task)
    this.trainer = trainerBuilder.build(this.client, options.scheme !== 'local')
  }

  /**
   * Starts a training instance for the Disco object's task on the provided data tuple.
   * @param dataTuple The data tuple
   */
  // TODO RoundLogs should contain number of participants but Trainer doesn't need client
  async *fit(
    dataTuple: data.DataSplit,
  ): AsyncGenerator<
    AsyncGenerator<
      AsyncGenerator<BatchLogs, EpochLogs>,
      RoundLogs & { participants: number }
    >
  > {
    this.logger.success("Training started.");

    const trainData = dataTuple.train.preprocess().batch();
    const validationData =
      dataTuple.validation?.preprocess().batch() ?? trainData;
    await this.client.connect();
    const trainer = await this.trainer;

    for await (const [round, epochs] of enumerate(
      trainer.fitModel(trainData.dataset, validationData.dataset),
    )) {
      yield async function* (this: Disco) {
        let epochsLogs = List<EpochLogs>();
        for await (const [epoch, batches] of enumerate(epochs)) {
          const [gen, returnedEpochLogs] = split(batches);

          yield gen;
          const epochLogs = await returnedEpochLogs;
          epochsLogs = epochsLogs.push(epochLogs);

          this.logger.success(
            [
              `Round: ${round}`,
              `  Epoch: ${epoch}`,
              `    Training loss: ${epochLogs.training.loss}`,
              `    Training accuracy: ${epochLogs.training.accuracy}`,
              epochLogs.validation !== undefined
                ? `    Validation loss: ${epochLogs.validation.loss}`
                : "",
              epochLogs.validation !== undefined
                ? `    Validation accuracy: ${epochLogs.validation.accuracy}`
                : "",
            ].join("\n"),
          );
        }

        return {
          epochs: epochsLogs,
          participants: this.client.nodes.size + 1, // add ourself
        };
      }.bind(this)();
    }

    this.logger.success("Training finished.");
  }

  /**
   * Stops the ongoing training instance without disconnecting the client.
   */
  async pause (): Promise<void> {
    const trainer = await this.trainer
    await trainer.stopTraining()
  }

  /**
   * Completely stops the ongoing training instance.
   */
  async close(): Promise<void> {
    await this.pause();
    await this.client.disconnect();
  }
}
