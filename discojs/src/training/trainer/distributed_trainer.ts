import * as tf from '@tensorflow/tfjs'

import { Client, Memory, Task, TrainingInformant, WeightsContainer } from '../..'

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
    memory: Memory,
    model: tf.LayersModel,
    private readonly previousRoundModel: tf.LayersModel,
    private readonly client: Client
  ) {
    super(task, trainingInformant, memory, model)
  }

  /**
   * Callback called every time a round is over
   */
  async onRoundEnd (accuracy: number): Promise<void> {
    const currentRoundWeights = WeightsContainer.from(this.model)
    const previousRoundWeights = WeightsContainer.from(this.previousRoundModel)

    const aggregatedWeights = await this.client.onRoundEndCommunication(
      currentRoundWeights,
      previousRoundWeights,
      this.roundTracker.round,
      this.trainingInformant
    )

    this.previousRoundModel.setWeights(currentRoundWeights.weights)
    this.model.setWeights(aggregatedWeights.weights)

    await this.memory.updateWorkingModel(
      { taskID: this.task.taskID, name: this.trainingInformation.modelID },
      this.model
    )
  }
  // if it is undefined, will training continue? we hope yes

  /**
   * Callback called once training is over
   */
  async onTrainEnd (): Promise<void> {
    await this.client.onTrainEndCommunication(
      WeightsContainer.from(this.model),
      this.trainingInformant
    )
    await super.onTrainEnd()
  }
}
