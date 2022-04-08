import * as tf from '@tensorflow/tfjs'

import { Client, Task, TrainingInformant } from 'discojs'

import * as memory from '../../memory'
import { Trainer } from './trainer'

/**
 * Class whose role is to train a model in a distributed way with a given dataset.
 */
export class DistributedTrainer extends Trainer {
  client: Client
  /** DistributedTrainer constructor, accepts same arguments as Trainer and in additional also a client who takes care of communicating weights.
   */
  constructor (task: Task, trainingInformant: TrainingInformant, useIndexedDB: boolean, model: tf.LayersModel, client: Client) {
    super(task, trainingInformant, useIndexedDB, model)
    this.client = client
  }

  /**
   * Callback called every time a round is over
   */
  async onRoundEnd (accuracy: number) {
    await this.client.onRoundEndCommunication(this.model, this.roundTracker.round, this.trainingInformant)
    if (this.useIndexedDB) {
      await memory.updateWorkingModel(
        this.task.taskID,
        this.trainingInformation.modelID,
        this.model
      )
    }
  }

  /**
   * Callback called once training is over
   */
  async onTrainEnd () {
    await this.client.onTrainEndCommunication(
      this.model,
      this.trainingInformant
    )
  }
}
