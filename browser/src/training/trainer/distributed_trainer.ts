import * as tf from '@tensorflow/tfjs'

import { Client, Task, TrainingInformant } from 'discojs'

import * as memory from '../../memory'
import { Trainer } from './trainer'

/**
 * Class whose role is to train a model in a distributed way with a given dataset.
 */
export class DistributedTrainer extends Trainer {
  /** DistributedTrainer constructor, accepts same arguments as Trainer and in additional also a client who takes care of communicating weights.
   */
  constructor (
    task: Task,
    trainingInformant: TrainingInformant,
    useIndexedDB: boolean,
    model: tf.LayersModel,
    private previousRoundModel: tf.LayersModel,
    public readonly client: Client
  ) {
    super(task, trainingInformant, useIndexedDB, model)
  }

  /**
   * Callback called every time a round is over
   */
  async onRoundEnd () {
    const currentRoundWeights = this.model.weights.map((w) => w.read())
    const previousRoundWeights = this.previousRoundModel.weights.map((w) => w.read())
    const aggregatedWeights = await this.client.onRoundEndCommunication(
      currentRoundWeights,
      previousRoundWeights,
      this.roundTracker.round,
      this.trainingInformant
    )
    this.previousRoundModel.setWeights(currentRoundWeights)
    this.model.setWeights(aggregatedWeights)

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
      this.model.weights.map((w) => w.read()),
      this.trainingInformant
    )
  }
}
