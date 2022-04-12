import { TrainingInformant } from './training_informant'
import { Trainer } from './trainer/trainer'
import { Client } from '../communication/client'
import { getClient } from '../communication/client_builder'
import { Task } from '../task/task'
import { Logger } from '../logging/logger'
import { TrainerBuilder } from './trainer/trainer_builder'
import * as tf from '@tensorflow/tfjs'
import { TrainingSchemes } from './trainingSchemes'

/**
 * Handles the training loop, server communication & provides the user with feedback.
 */
export class Disco {
  task: Task
  client: Client
  trainer: Trainer
  logger: Logger
  trainingInformant: TrainingInformant
  isConnected: boolean
  isTraining: boolean
  distributedTraining: boolean
  trainingScheme: TrainingSchemes
  useIndexedDB: boolean

  constructor (task: Task, logger: Logger, useIndexedDB: boolean) {
    this.task = task
    this.logger = logger
    this.isConnected = false
    this.isTraining = false
    this.distributedTraining = false
    this.useIndexedDB = useIndexedDB

    this.client = undefined
    this.trainingScheme = undefined
    this.trainingInformant = new TrainingInformant(10, this.task.taskID)
  }

  /**
   * Initialize the client depending on the trainingType Chosen
   */
  private async initOrUpdateClient (trainingScheme : TrainingSchemes) {
    if (trainingScheme === TrainingSchemes.LOCAL) {
      this.client = undefined
      this.trainingScheme = trainingScheme
      console.log('No client needed when Training Locally')
    } else if (this.client === undefined || trainingScheme !== this.trainingScheme) {
      this.client = getClient(
        trainingScheme,
        this.task,
        undefined // TODO: this.$store.getters.password(this.id)
      )
      this.trainingScheme = trainingScheme
      console.log('Initialized client ' + trainingScheme)
    }
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
  private async disconnect () {
    await this.client.disconnect()
  }

  /**
   * Runs training according to the scheme defined in the Task's trainingInformation.
   * If default scheme is Decentralized for now, if nothing is specified.
   */
  async startTaskDefinedTraining (dataset: tf.data.Dataset<tf.TensorContainer>) {
    if (this.task.trainingInformation.scheme === 'Federated') {
      await this.startTraining(dataset, TrainingSchemes.FEDERATED)
    } else {
      // The Default training scheme is Decentralized
      await this.startTraining(dataset, TrainingSchemes.DECENTRALIZED)
    }
  }

  /**
   * Runs training using Local Scheme
   */
  async startLocalTraining (dataset: tf.data.Dataset<tf.TensorContainer>) {
    await this.startTraining(dataset, TrainingSchemes.LOCAL)
  }

  /**
   * @param {tf.data.Dataset<tf.TensorContainer>} dataset The preprocessed dataset to train on
   * @param {boolean} distributed Whether to train in a distributed or local fashion
   */
  async startTraining (dataset: tf.data.Dataset<tf.TensorContainer>, trainingScheme: TrainingSchemes): Promise<void> {
    await this.initOrUpdateClient(trainingScheme)

    // Connects to the server
    if (trainingScheme !== TrainingSchemes.LOCAL && !this.isConnected) {
      await this.connect()
      if (!this.isConnected) {
        this.distributedTraining = false
        this.logger.error('Distributed training is not available.')
      } else {
        this.distributedTraining = true
      }
    }

    if (dataset.size === 0) {
      this.logger.error('Training aborted. No uploaded file given as input.')
    } else {
      this.logger.success(
        'Thank you for your contribution. Data preprocessing has started'
      )
      await this.initTrainer(dataset)
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
  private async initTrainer (dataset: tf.data.Dataset<tf.TensorContainer>) {
    const trainerBuilder = new TrainerBuilder(this.useIndexedDB, this.task, this.trainingInformant)
    this.trainer = await trainerBuilder.build(
      dataset.size,
      this.client,
      this.distributedTraining
    )
  }
}
