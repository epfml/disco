import { TrainingInformant } from './training_informant'
import { Trainer } from './trainer/trainer'
import { DistributedTrainer } from './trainer/distributed_trainer'
import { LocalTrainer } from './trainer/local_trainer'
import { Client } from '../communication/client'
import { Task } from '../task/task'
import { Logger } from '../logging/logger'
import { Platform } from '../../platforms/platform'
import { RoundTracker } from './trainer/round_tracker'
import * as memory from '../memory/utils'
import * as tf from '@tensorflow/tfjs'

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
    this.client = Client.getClient(
      this.platform,
      this.task,
      null // TODO: this.$store.getters.password(this.id)
    )
    this.trainingInformant = new TrainingInformant(10, this.task.taskID)
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
  async startTraining (dataset: tf.data.Dataset<tf.TensorContainer>, distributed: boolean) {
    if (distributed && !this.isConnected) {
      await this.connect()
      if (!this.isConnected) {
        distributed = false
        this.logger.error('Distributed training is not available.')
      }
    }
    this.distributedTraining = distributed
    if (dataset.size === 0) {
      this.logger.error('Training aborted. No uploaded file given as input.')
    } else {
      this.logger.success(
        'Thank you for your contribution. Data preprocessing has started'
      )
      this.initTrainer(dataset)
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

  /**
   * Build the appropriate training class (either local or distributed)
   */
  private async initTrainer (dataset: any) {
    const roundTracker = new RoundTracker(
      this.task.trainingInformation.roundDuration,
      dataset.size(),
      this.task.trainingInformation.batchSize
    )
    const params = [
      this.task,
      this.trainingInformant,
      this.useIndexedDB,
      roundTracker,
      await this.getModel()
    ] as const
    if (this.distributedTraining) {
      this.trainer = new DistributedTrainer(...params, this.client)
    } else {
      this.trainer = new LocalTrainer(...params)
    }
  }

  private async getModel () {
    const model = await this.getModelFromMemoryOrFetchIt()
    return this.updateModelInformation(model)
  }

  /**
   *
   * @returns
   */
  private async getModelFromMemoryOrFetchIt () {
    const modelExistsInMemory = await memory.getWorkingModelMetadata(
      this.task.taskID,
      this.task.trainingInformation.modelID
    )

    if (this.useIndexedDB && modelExistsInMemory) {
      await memory.getWorkingModel(
        this.task.taskID,
        this.task.trainingInformation.modelID
      )
    }
    return await this.client.getModel()
  }

  private updateModelInformation (model: tf.LayersModel) {
    // Continue local training from previous epoch checkpoint
    if (model.getUserDefinedMetadata() === undefined) {
      model.setUserDefinedMetadata({ epoch: 0 })
    }

    const info = this.task.trainingInformation
    model.compile(info.modelCompileData)

    if (info.learningRate) {
      // TODO: Not the right way to change learningRate and hence we cast to any
      // the right way is to construct the optimiser and pass learningRate via
      // argument.
      (model.optimizer as any).learningRate = info.learningRate
    }

    return model
  }
}
