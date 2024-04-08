import { Trainer } from './trainer.js'

/** Class whose role is to locally (alone) train a model on a given dataset,
 * without any collaborators.
 */
export class LocalTrainer extends Trainer {
  async onRoundBegin (): Promise<void> {
    return await Promise.resolve()
  }

  async onRoundEnd (): Promise<void> {
    console.log('on round end')
    await this.memory.updateWorkingModel(
      { taskID: this.task.id, name: this.task.trainingInformation.modelID },
      this.model
    )
  }
}
