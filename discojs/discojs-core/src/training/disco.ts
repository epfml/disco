import type { data, Logger, Memory, Task, TrainingInformant, TrainingInformation } from '../index.js'
import { client as clients, informant as informants, EmptyMemory, ConsoleLogger } from '../index.js'
import type { Trainer } from './trainer/trainer.js'
import { TrainerBuilder } from './trainer/trainer_builder.js'
import type { TrainerLog } from '../logging/trainer_logger.js'
import type { Aggregator } from '../aggregator/index.js'
import { MeanAggregator } from '../aggregator/mean.js'

export interface DiscoOptions {
  client?: clients.Client
  aggregator?: Aggregator
  url?: string | URL
  scheme?: TrainingInformation['scheme']
  informant?: TrainingInformant
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
    if (options.informant === undefined) {
      switch (options.scheme) {
        case 'federated':
          options.informant = new informants.FederatedInformant(task)
          break
        case 'decentralized':
          options.informant = new informants.DecentralizedInformant(task)
          break
        case 'local':
          options.informant = new informants.LocalInformant(task)
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
    if (options.informant.task.id !== task.id) {
      throw new Error('informant not setup for given task')
    }

    this.task = task
    this.client = options.client
    this.memory = options.memory
    this.logger = options.logger

    const trainerBuilder = new TrainerBuilder(this.memory, this.task, options.informant)
    this.trainer = trainerBuilder.build(this.client, options.scheme !== 'local')
  }

  /**
   * Starts a training instance for the Disco object's task on the provided data tuple.
   * @param dataTuple The data tuple
   */
  async fit (dataTuple: data.DataSplit): Promise<void> {
    const trainData = dataTuple.train.preprocess().batch()
    const validationData = dataTuple.validation?.preprocess().batch() ?? trainData
    await this.client.connect()
    const trainer = await this.trainer
    await trainer.fitModel(trainData.dataset, validationData.dataset)
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
  async close (): Promise<void> {
    await this.pause()
    await this.client.disconnect()
  }

  async logs (): Promise<TrainerLog> {
    const trainer = await this.trainer
    return trainer.getTrainerLog()
  }
}
