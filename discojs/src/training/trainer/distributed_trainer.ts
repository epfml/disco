import * as tf from '@tensorflow/tfjs'

import { Client, Memory, Task, TrainingInformant } from '@/.'

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
    const currentRoundWeights = this.model.weights.map((w) => w.read())
    const previousRoundWeights = this.previousRoundModel.weights.map((w) => w.read())

    const aggregatedWeights = await this.client.onRoundEndCommunication(
      currentRoundWeights,
      previousRoundWeights,
      this.roundTracker.round,
      this.trainingInformant
    )


    if (aggregatedWeights!==undefined) {
      this.previousRoundModel.setWeights(currentRoundWeights)
      this.model.setWeights(aggregatedWeights)

      await this.memory.updateWorkingModel(
          this.task.taskID,
          this.trainingInformation.modelID,
          this.model
      )
    }}
  //if it is undefined, will training continue? we hope yes

  /**
   * Callback called once training is over
   */
  async onTrainEnd (): Promise<void> {
    await this.client.onTrainEndCommunication(
      this.model.weights.map((w) => w.read()),
      this.trainingInformant
    )
  }
}
