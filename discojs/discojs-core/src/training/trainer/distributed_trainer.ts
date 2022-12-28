import { tf, Client, Memory, Task, TrainingInformant, TrainingFunction, WeightsContainer } from '../..'

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
    private readonly client: Client,
    private previousMomentum: WeightsContainer,
    trainModelFunction?: TrainingFunction
  ) {
    super(task, trainingInformant, memory, model, trainModelFunction)
  }

  /**
   * Callback called every time a round is over
   */
  async onRoundEnd (accuracy: number): Promise<void> {
    const beta = 0.5 // TODO: Add parameter to task definition

    const currentRoundWeights = WeightsContainer.from(this.model)
    const previousRoundWeights = WeightsContainer.from(this.previousRoundModel)

    // Computing currentMomentum to be used in Byzantine-Robust Aggregator
    const currentMomentum = currentRoundWeights.sub(previousRoundWeights).mul(tf.scalar(1 - beta)).add(this.previousMomentum.mul(tf.scalar(beta)))

    const aggregatedWeights = await this.client.onRoundEndCommunication(
      currentRoundWeights,
      previousRoundWeights,
      currentMomentum,
      this.roundTracker.round,
      this.trainingInformant
    )

    this.previousRoundModel.setWeights(aggregatedWeights.weights)
    this.model.setWeights(aggregatedWeights.weights)
    this.previousMomentum = currentMomentum

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
