import { ConsoleLogger } from '../../logging/console_logger'
import * as tf from '@tensorflow/tfjs'

export interface TrainerLog {
  epochs: number[]
  trainAccuracy: number[]
  validationAccuracy: number[]
  loss: number[]
}

/**
 *
 * @class TrainerLogger
 */
export class TrainerLogger extends ConsoleLogger {
  epochs: number[] = []
  trainAccuracy: number[] = []
  validationAccuracy: number[] = []
  loss: number[] = []
  isLogSaveEnabled: boolean

  constructor (isLogSaveEnabled: boolean = false) {
    super()
    this.isLogSaveEnabled = isLogSaveEnabled
  }

  onBatchEnd (batch: number, logs: tf.Logs): void {
    // logs.val_acc is not available on batch end
    this.information(`On batch end:${batch}\n Train Accuracy:${logs.acc}`)
  }

  onEpochEnd (epoch: number, logs: tf.Logs): void {
    // save logs
    if (this.isLogSaveEnabled) {
      this.saveLog(epoch, logs)
    }
    // console output
    const msg = `Train:${logs.acc}\nValidation:${logs.val_acc}\nLoss:${logs.loss}`
    this.information(`On epoch end accuracy:\n${msg}`)
  }

  getTrainerLog (): TrainerLog {
    return {
      epochs: this.epochs,
      trainAccuracy: this.trainAccuracy,
      validationAccuracy: this.validationAccuracy,
      loss: this.loss
    }
  }

  private saveLog (epoch: number, logs: tf.Logs): void {
    this.epochs.push(epoch)
    this.trainAccuracy.push(logs.acc)
    this.validationAccuracy.push(logs.val_acc)
    this.loss.push(logs.loss)
  }

  /**
   *  Display ram usage
   */
  ramUsage (): void {
    this.information(`Training RAM usage is  = ${tf.memory().numBytes * 0.000001} MB`)
    this.information(`Number of allocated tensors  = ${tf.memory().numTensors}`)
  }
}
