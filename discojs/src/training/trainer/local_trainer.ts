import { Trainer } from './trainer'

/** Class whose role is to locally train a model with a given dataset.
 */
export class LocalTrainer extends Trainer {
  /**
   * Callback called every time a round is over
   */
  async onRoundEnd (accuracy: number): Promise<void> {
    await this.memory.updateWorkingModel(
      this.task.taskID,
      this.trainingInformation.modelID,
      this.model
    )
  }

  async onTrainEnd (): Promise<void> {
    // nothing to do
  }
}
