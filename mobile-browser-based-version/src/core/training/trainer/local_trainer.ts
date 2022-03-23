import * as memory from '../../memory/utils'
import { Trainer } from './trainer'

/** Class whose role is to locally train a model with a given dataset.
 */
export class LocalTrainer extends Trainer {
  /**
   * Callback called every time a round is over
   */
  async onRoundEnd (accuracy: number) {
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
  async onTrainEnd () {}
}
