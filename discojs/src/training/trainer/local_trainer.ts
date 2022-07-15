import { Trainer } from './trainer'
import { Logs } from '@tensorflow/tfjs'

/** Class whose role is to locally (alone) train a model on a given dataset, without any collaborators.
 */
export class LocalTrainer extends Trainer {
  /**
   * Callback called every time a round is over. For local training, a round is typically an epoch
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
