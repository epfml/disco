import { TrainingInformant, Client, Task, Logger, dataset } from 'discojs'

import { getClient } from '../communication/client_builder'
import { Platform } from '../platforms/platform'
import { Trainer } from './trainer/trainer'
import { TrainerBuilder } from './trainer/trainer_builder'

/**
 * Handles the training loop, server communication & provides the user with feedback.
 */
export class Disco {
  platform: Platform
  task: Task
  client: Client
  trainer: Trainer
  logger: Logger
  trainingInformant: TrainingInformant
  isConnected: boolean
  isTraining: boolean
  distributedTraining: boolean
  useIndexedDB: boolean

  constructor (task: Task, platform: Platform, logger: Logger, useIndexedDB: boolean) {
    this.task = task
    this.logger = logger
    this.isConnected = false
    this.isTraining = false
    this.distributedTraining = false
    this.platform = platform
    this.useIndexedDB = useIndexedDB
    this.client = getClient(
      this.platform,
      this.task,
      undefined // TODO: this.$store.getters.password(this.id)
    )
    this.trainingInformant = new TrainingInformant(10, this.task.taskID)
  }

  /**
   * Connects the Disco instance to the server
   */
  async connect (): Promise<void> {
    try {
      await this.client.connect()
      this.logger.success(
        'Successfully connected to server. Distributed training available.'
      )
      this.isConnected = true
    } catch (err) {
      console.log(`connect server: ${err}`)
      this.logger.error(
        'Failed to connect to server. Fallback to training alone.'
      )
      this.isConnected = false
    }
  }

  /**
   * Disconnects the client from the server
   */
  async disconnect () {
    await this.client.disconnect()
  }

  /**
   * @param {tf.data.Dataset<tf.TensorContainer>} data The preprocessed dataset to train on
   * @param {boolean} distributed Whether to train in a distributed or local fashion
   */
  async startTraining (data: dataset.Data, distributed: boolean): Promise<void> {
    if (distributed && !this.isConnected) {
      await this.connect()
      if (!this.isConnected) {
        distributed = false
        this.logger.error('Distributed training is not available.')
      }
    }
    this.distributedTraining = distributed
    if (data.size === 0) {
      this.logger.error('Training aborted. No uploaded file given as input.')
    } else {
      this.logger.success(
        'Thank you for your contribution. Data preprocessing has started'
      )
      await this.initTrainer()
      this.trainer.trainModel(data.dataset, data.size)
      this.isTraining = true
    }
  }

  /**
   * Stops the training function and disconnects from
   */
  async stopTraining () {
    this.trainer.stopTraining()
    if (this.isConnected) {
      await this.client.disconnect()
      this.isConnected = false
    }
    this.logger.success('Training was successfully interrupted.')
    this.isTraining = false
  }

  /**
   * Build the appropriate training class (either local or distributed)
   */
  private async initTrainer () {
    const trainerBuilder = new TrainerBuilder(this.useIndexedDB, this.task, this.trainingInformant)
    this.trainer = await trainerBuilder.build(
      this.client,
      this.distributedTraining
    )
  }
}
