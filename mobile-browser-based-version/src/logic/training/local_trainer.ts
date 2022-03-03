import * as memory from '../memory/model_io'
import { Trainer } from './trainer'

/** Class whose role is to locally train a model with a given dataset.
 */
export class LocalTrainer extends Trainer {
  /**
   * train a model in a locally with a given dataset.
   * @param {Object} dataset the dataset to train on
   */
  async trainModel (dataset) {
    await this._initDatasetAndModel(dataset)
    this._trainLocally()
  }

  /**
   *  Method that chooses the appropriate modelFitData function and defines the modelFit callbacks for local training.
   */
  async _trainLocally () {
    const info = this.task.trainingInformation

    await this._modelFitDataBatchWise(this.model, info, {
      onEpochEnd: async (epoch, logs) => {
        this._onEpochEnd(logs.acc, logs.val_acc)
      },
      onBatchEnd: async (batch, logs) => {
        this._onBatchEnd(
          batch + 1,
          this._formatAccuracy(logs.acc),
          info
        )
      }
    })
  }

  /**
   * Callback called every time a round is over
   */
  async _onRoundEnd (
    accuracy,
    trainingInformation
  ) {
    if (this.useIndexedDB) {
      await memory.updateWorkingModel(
        this.task.taskID,
        trainingInformation.modelID,
        this.model
      )
    }
  }

  /**
   * Method corresponding to the TFJS fit function's callback. Calls the client's
   * subroutine used in local training
   */
  async _onBatchEnd (
    batch,
    accuracy,
    trainingInformation
  ) {
    // Important to call parent onBatchEnd, this adds additional functionality such as listening to
    // the stop train event and logging.
    super._onBatchEnd(batch, accuracy, trainingInformation)
    if (this.roundTracker.roundHasEnded()) {
      this._onRoundEnd(
        accuracy,
        trainingInformation
      )
    }
  }
}
