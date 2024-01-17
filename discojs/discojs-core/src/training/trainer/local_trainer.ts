import { tf } from '../..'
import { Trainer } from './trainer'

/** Class whose role is to locally (alone) train a model on a given dataset, 
 * without any collaborators.
 */
export class LocalTrainer extends Trainer {
  async onRoundBegin (accuracy: number): Promise<void> {}

  async onRoundEnd (accuracy: number): Promise<void> {
    console.log('on round end')
    await this.memory.updateWorkingModel(
      { taskID: this.task.taskID, name: this.task.trainingInformation.modelID },
      this.model
    )
  }

  protected onEpochEnd (epoch: number, logs?: tf.Logs): void {
    super.onEpochEnd(epoch, logs)
    console.log('on epoch end')
    this.trainingInformant.update({ currentRound: epoch })
  }
}
