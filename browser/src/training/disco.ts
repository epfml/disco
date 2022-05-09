import { TrainingInformant, Client, Task, Logger, dataset, TrainingSchemes } from 'discojs'

import { getClient } from '../communication/client_builder'
import { Trainer } from './trainer/trainer'
import { TrainerBuilder } from './trainer/trainer_builder'

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
  distributedTraining: boolean
  trainingScheme: TrainingSchemes
  taskDefinedTrainingScheme : TrainingSchemes
  useIndexedDB: boolean

  constructor (task: Task, logger: Logger, useIndexedDB: boolean) {
    this.task = task
    this.logger = logger
    this.isConnected = false
    this.distributedTraining = false
    this.useIndexedDB = useIndexedDB

    this.client = undefined
    this.trainingScheme = undefined
    this.taskDefinedTrainingScheme = this.task.trainingInformation.scheme === 'Federated'
      ? TrainingSchemes.FEDERATED
      : TrainingSchemes.DECENTRALIZED
    this.trainingInformant = new TrainingInformant(10, this.task.taskID, this.taskDefinedTrainingScheme)
  }

  /**
   * Initialize the client depending on the trainingType Chosen
   */
  private async initOrUpdateClient (trainingScheme : TrainingSchemes) {
    if (trainingScheme === TrainingSchemes.LOCAL) {
      this.client = undefined
      this.trainingScheme = trainingScheme
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
    this.isConnected = false
  }

  /**
   * Runs training according to the scheme defined in the Task's trainingInformation.
   * If default scheme is Decentralized for now, if nothing is specified.
   */
  async startTaskDefinedTraining (data: dataset.Data) {
    await this.startTraining(data, this.taskDefinedTrainingScheme)
  }

  /**
   * Runs training using Local Scheme
   */
  async startLocalTraining (data: dataset.Data) {
    await this.startTraining(data, TrainingSchemes.LOCAL)
  }

  /**
   * @param data The preprocessed dataset to train on
   * @param trainingScheme Whether to train in a distributed or local fashion
   */
  async startTraining (data: dataset.Data, trainingScheme: TrainingSchemes): Promise<void> {
    await this.initOrUpdateClient(trainingScheme)

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
    await this.initTrainer()
    await this.trainer.trainModel(data.dataset)
  }

  /**
   * Stops the training function and disconnects from
   */
  async stopTraining () {
    this.trainer.stopTraining()
    if (this.isConnected) {
      await this.disconnect()
    }
    this.logger.success('Training was successfully interrupted.')
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
