import { Trainer } from './trainer'
import { Logs } from '@tensorflow/tfjs'

/** Class whose role is to locally train a model with a given dataset.
 */
export class LocalTrainer extends Trainer {
  /**
   * Callback called every time a round is over
   */
  async onRoundEnd (accuracy: number): Promise<void> {
    await this.memory.updateWorkingModel(
      { taskID: this.task.taskID, name: this.trainingInformation.modelID },
      this.model
    )
  }

  protected onEpochEnd (epoch: number, logs?: Logs): void {
    super.onEpochEnd(epoch, logs)
    this.trainingInformant.update({ currentRound: epoch })
  }
}
