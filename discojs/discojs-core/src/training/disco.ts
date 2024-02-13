import {
  client as clients,
  type data,
  type Logger,
  type Task,
  type TrainingInformant, informant as informants,
  TrainingSchemes,
  type Memory, EmptyMemory,
  ConsoleLogger,
  type TrainingFunction
} from '..'
import { type Trainer } from './trainer/trainer'
import { TrainerBuilder } from './trainer/trainer_builder'
import { type TrainerLog } from '../logging/trainer_logger'
import { type Aggregator } from '../aggregator'
import { MeanAggregator } from '../aggregator/mean'

export interface DiscoOptions {
  client?: clients.Client
  aggregator?: Aggregator
  url?: string | URL
  scheme?: TrainingSchemes
  informant?: TrainingInformant
  logger?: Logger
  memory?: Memory
  customTrainingFunction?: TrainingFunction
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
  private readonly aggregator: Aggregator
  private readonly trainer: Promise<Trainer>

  constructor (
    task: Task,
    options: DiscoOptions
  ) {
    if (options.scheme === undefined) {
      options.scheme = TrainingSchemes[task.trainingInformation.scheme as keyof typeof TrainingSchemes]
    }
    if (options.aggregator === undefined) {
      options.aggregator = new MeanAggregator(task)
    }
    if (options.client === undefined) {
      if (options.url === undefined) {
        throw new Error('could not determine client from given parameters')
      }

      if (typeof options.url === 'string') {
        options.url = new URL(options.url)
      }
      switch (options.scheme) {
        case TrainingSchemes.FEDERATED:
          options.client = new clients.federated.FederatedClient(options.url, task, options.aggregator)
          break
        case TrainingSchemes.DECENTRALIZED:
          options.client = new clients.decentralized.DecentralizedClient(options.url, task, options.aggregator)
          break
        default:
          options.client = new clients.Local(options.url, task, options.aggregator)
          break
      }
    }
    if (options.informant === undefined) {
      switch (options.scheme) {
        case TrainingSchemes.FEDERATED:
          options.informant = new informants.FederatedInformant(task)
          break
        case TrainingSchemes.DECENTRALIZED:
          options.informant = new informants.DecentralizedInformant(task)
          break
        default:
          options.informant = new informants.LocalInformant(task)
          break
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
    if (options.informant.task.taskID !== task.taskID) {
      throw new Error('informant not setup for given task')
    }

    this.task = task
    this.client = options.client
    this.aggregator = options.aggregator
    this.memory = options.memory
    this.logger = options.logger

    const trainerBuilder = new TrainerBuilder(this.memory, this.task, options.informant, options.customTrainingFunction)
    this.trainer = trainerBuilder.build(this.aggregator, this.client, options.scheme !== TrainingSchemes.LOCAL)
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
