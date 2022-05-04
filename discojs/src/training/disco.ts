import { Memory } from '@/memory'
import { TrainingInformant, Client, Task, Logger, dataset, TrainingSchemes } from '..'

import { Trainer } from './trainer/trainer'
import { TrainerBuilder } from './trainer/trainer_builder'

/**
 * Handles the training loop, server communication & provides the user with feedback.
 */
export class Disco {
  trainingInformant: TrainingInformant
  isConnected: boolean
  distributedTraining: boolean
  taskDefinedTrainingScheme: TrainingSchemes

  // cached trainer
  private readonly trainer: Trainer | undefined

  constructor (
    public readonly task: Task,
    public readonly logger: Logger,
    public readonly memory: Memory,
    public readonly client: Client
  ) {
    this.isConnected = false
    this.distributedTraining = false

    this.taskDefinedTrainingScheme = this.task.trainingInformation?.scheme === 'Federated'
      ? TrainingSchemes.FEDERATED
      : TrainingSchemes.DECENTRALIZED
    this.trainingInformant = new TrainingInformant(10, this.task.taskID, this.taskDefinedTrainingScheme)
  }

  /**
   * Connects the Disco instance to the server
   */
  private async connect (): Promise<void> {
    try {
      await this.client.connect()
      this.logger.success(
        'Successfully connected to server. Distributed training available.'
      )
      this.isConnected = true
    } catch (err) {
      console.log('connect server', err)
      this.logger.error(
        'Failed to connect to server. Fallback to training alone.'
      )
      this.isConnected = false
    }
  }

  /**
   * Disconnects the client from the server
   */
  private async disconnect (): Promise<void> {
    await this.client.disconnect()
    this.isConnected = false
  }

  /**
   * Runs training according to the scheme defined in the Task's trainingInformation.
   * If default scheme is Decentralized for now, if nothing is specified.
   */
  async startTaskDefinedTraining (data: dataset.Data): Promise<void> {
    await this.startTraining(data, this.taskDefinedTrainingScheme)
  }

  /**
   * Runs training using Local Scheme
   */
  async startLocalTraining (data: dataset.Data): Promise<void> {
    await this.startTraining(data, TrainingSchemes.LOCAL)
  }

  /**
   * @param data The preprocessed dataset to train on
   * @param distributed Whether to train in a distributed or local fashion
   */
  async startTraining (data: dataset.Data, trainingScheme: TrainingSchemes): Promise<void> {
    if (data.size === 0) {
      this.logger.error('Training aborted. No uploaded file given as input.')
      throw new Error('No data in dataset')
    }

    // Connects to the server
    if (trainingScheme !== TrainingSchemes.LOCAL && !this.isConnected) {
      await this.connect()
      if (!this.isConnected) {
        this.distributedTraining = false
        this.logger.error('Distributed training is not available.')
        throw new Error('No distributed training available')
      } else {
        this.distributedTraining = true
      }
    }
    this.logger.success(
      'Thank you for your contribution. Data preprocessing has started'
    )

    // TODO: dataset.size = null, since we build it with an iterator (issues occurs with ImageLoader) see issue 279
    const trainer = await this.getTrainer()
    await trainer.trainModel(data.dataset)
  }

  /**
   * Stops the training function and disconnects from
   */
  async stopTraining (): Promise<void> {
    await (await this.getTrainer()).stopTraining()
    if (this.isConnected) {
      await this.disconnect()
    }
    this.logger.success('Training was successfully interrupted.')
  }

  /**
   * Build the appropriate training class (either local or distributed)
   */
  private async getTrainer (): Promise<Trainer> {
    if (this.trainer !== undefined) {
      return this.trainer
    }

    const trainerBuilder = new TrainerBuilder(this.memory, this.task, this.trainingInformant)
    return await trainerBuilder.build(
      this.client,
      this.distributedTraining
    )
  }
}
