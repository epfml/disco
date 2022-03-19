import { TrainingInformant } from './training_informant'
import { Trainer } from './trainer/trainer'
import { DistributedTrainer } from './trainer/distributed_trainer'
import { LocalTrainer } from './trainer/local_trainer'
import { getClient } from '../communication/client_builder'
import { Client } from '../communication/client'
import { Task } from '../task_definition/base/task'
import { Logger } from '../logging/logger'
import { Platform } from '../../platforms/platform'

/**
 * Handles the training loop, server communication & provides the user with feedback.
 */
export class TrainingManager {
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
      null // TODO: this.$store.getters.password(this.id)
    )
    this.trainingInformant = new TrainingInformant(10, this.task.taskID)
  }

  /**
   * Build the appropriate training class (either local or distributed)
   */
  private async initTrainer (dataset) {
    const params = [dataset, this.task, this.trainingInformant, this.useIndexedDB]
    if (this.distributedTraining) {
      this.trainer = new DistributedTrainer(...params, this.client)
    } else {
      this.trainer = new LocalTrainer(...params)
    }
  }

  /**
   * Connects the TrainingManager to the server
   */
  async connect () {
    // Connect to centralized server
    this.isConnected = await this.client.connect()
    if (this.isConnected) {
      this.logger.success(
        'Successfully connected to server. Distributed training available.'
      )
    } else {
      console.log('Error in connecting')
      this.logger.error(
        'Failed to connect to server. Fallback to training alone.'
      )
    }
    return this.isConnected
  }

  /**
   * Disconnects the client from the server
   */
  disconnect () {
    this.client.disconnect()
  }

  /**
   * @param {any} dataset The preprocessed dataset to train on
   * @param {boolean} distributed Whether to train in a distributed or local fashion
   */
  async startTraining (dataset: any, distributed: boolean) {
    this.initTrainer(dataset)
    if (distributed && !this.isConnected) {
      await this.connect()
      if (!this.isConnected) {
        distributed = false
        this.logger.error('Distributed training is not available.')
      }
    }
    this.distributedTraining = distributed
    if (dataset.size() === 0) {
      this.logger.error('Training aborted. No uploaded file given as input.')
    } else {
      this.logger.success(
        'Thank you for your contribution. Data preprocessing has started'
      )
      this.trainer.trainModel(dataset)
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
}
