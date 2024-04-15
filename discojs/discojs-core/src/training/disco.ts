import type { data, Logger, Memory, Task, TrainingInformation } from '../index.js'
import { client as clients, EmptyMemory, ConsoleLogger } from '../index.js'
import type { Aggregator } from '../aggregator/index.js'
import { MeanAggregator } from '../aggregator/mean.js'

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
  async *fit(dataTuple: data.DataSplit): AsyncGenerator<RoundLogs> {
    this.logger.success("Training started.");

    const trainData = dataTuple.train.preprocess().batch();
    const validationData =
      dataTuple.validation?.preprocess().batch() ?? trainData;
    await this.client.connect();
    const trainer = await this.trainer;

    for await (const roundLogs of trainer.fitModel(trainData.dataset, validationData.dataset)) {
      let msg = `Round: ${roundLogs.round}\n`
      for (const epochLogs of roundLogs.epochs.values()) {
        msg += `    Epoch: ${epochLogs.epoch}\n`
        msg += `        Training loss: ${epochLogs.training.loss}\n`
        if (epochLogs.training.accuracy !== undefined) {
          msg += `        Training accuracy: ${epochLogs.training.accuracy}\n`
        }
        if (epochLogs.validation !== undefined) {
          msg += `        Validation loss: ${epochLogs.validation.loss}\n`
          msg += `        Validation accuracy: ${epochLogs.validation.accuracy}\n`
        }
      }
      this.logger.success(msg)

      yield roundLogs
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
