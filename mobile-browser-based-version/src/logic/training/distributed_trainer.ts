import * as memory from '../memory/model_io'
import { Trainer } from './trainer'

// TODO: user trainingInformant and task as class

/**
 * Class whose role is to train a model in a distributed way with a given dataset.
 */
export class DistributedTrainer extends Trainer {
  /**
   * train a model in a distributed way with a given dataset.
   * @param {Object} dataset the dataset to train on
   * @param {Boolean} distributedTraining train in a distributed fashion
   */
  async trainModel (dataset) {
    await this._initDatasetAndModel(dataset)
    this._trainDistributed()
  }

  async _trainDistributed () {
    const info = this.task.trainingInformation

    await this.client.updateModelAndRoundFromServer()

    await this._modelFitDataBatchWise(this.model, info, {
      onTrainEnd: async (logs) => {
        await this._onTrainEnd()
      },
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
    await this.client.onRoundEndCommunication(this.model, this.roundTracker.round, this.trainingInformant)
    if (this.useIndexedDB) {
      await memory.updateWorkingModel(
        this.task.taskID,
        trainingInformation.modelID,
        this.model
      )
    }
  }

  /**
   * On batch end we call the onBatchEndCommunication of client, this in turn will call the onRoundEnd whenever a round has ended.
   *
   * @Remark Since we support fractional rounds this might before an epoch, since it might be after an epoch, we keep track of
   * epochs globally and pass it as an argument.
   * @param batch
   * @param accuracy
   * @param validationAccuracy
   * @param trainingInformation
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

  /**
   * Method corresponding to the TFJS fit function's callback. Calls the client's
   * subroutine.
   */
  async _onTrainEnd () {
    await this.client.onTrainEndCommunication(
      this.model,
      this.trainingInformant
    )
  }
}
