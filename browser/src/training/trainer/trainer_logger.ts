import { ConsoleLogger } from 'discojs'
import * as tf from '@tensorflow/tfjs'
import { List } from 'immutable'

export class TrainerLog {
  epochs: List<number> = List()
  trainAccuracy: List<number> = List()
  validationAccuracy: List<number> = List()
  loss: List<number> = List()

  add (epoch: number, logs: tf.Logs): void {
    this.epochs = this.epochs.push(epoch)
    this.trainAccuracy = this.trainAccuracy.push(logs.acc)
    this.validationAccuracy = this.validationAccuracy.push(logs.val_acc)
    this.loss = this.loss.push(logs.loss)
  }
}

/**
 *
 * @class TrainerLogger
 */
export class TrainerLogger extends ConsoleLogger {
  readonly log: TrainerLog
  readonly saveTrainerLog: boolean

  // TODO: pass savaTrainerLog as false in browser, used for benchmarking
  constructor (saveTrainerLog: boolean = true) {
    super()
    this.saveTrainerLog = saveTrainerLog
    this.log = new TrainerLog()
  }

  onBatchEnd (batch: number, logs: tf.Logs): void {
    // logs.val_acc is not available on batch end
    // this.success(`On batch end:${batch}\n Train Accuracy:${logs.acc}`)
  }

  onEpochEnd (epoch: number, logs: tf.Logs): void {
    // save logs
    if (this.saveTrainerLog) {
      this.log.add(epoch, logs)
    }
    // console output
    const msg = `Train:${logs.acc}\nValidation:${logs.val_acc}\nLoss:${logs.loss}`
    this.success(`On epoch end accuracy:\n${msg}`)
  }

  /**
   *  Display ram usage
   */
  ramUsage (): void {
    this.success(`Training RAM usage is  = ${tf.memory().numBytes * 0.000001} MB`)
    this.success(`Number of allocated tensors  = ${tf.memory().numTensors}`)
  }
}
