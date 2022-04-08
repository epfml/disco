import * as tf from '@tensorflow/tfjs'
import chalk from 'chalk'

import { Logger } from 'discojs'

/**
 * Same properties as Toaster but on the console
 *
 * @class Logger
 */
// TODO rm, see ConsoleLogger
export class TrainerLogger extends Logger {
  /**
   * Logs success message on the console (in green)
   * @param {String} message - message to be displayed
   */
  success (message: string) {
    console.log(chalk.green(message))
  }

  /**
   * Logs error message on the console (in red)
   * @param {String} message - message to be displayed
   */
  error (message: string) {
    console.log(chalk.red(message))
  }

  onBatchEnd (batch: number, accuracy: number) {
    this.success(`On batch end:${batch}`)
    this.success(`Train Accuracy: ${accuracy}`)
  }

  onEpochEnd (accuracy: number, validationAccuracy: number) {
    this.success(
      `OnEpochEnd:\n Train Accuracy: ${accuracy},
      Val Accuracy:  ${validationAccuracy}\n`
    )
  }

  /**
   *  Display ram usage
   */
  ramUsage () {
    this.success(`Training RAM usage is  = ${tf.memory().numBytes * 0.000001} MB`)
    this.success(`Number of allocated tensors  = ${tf.memory().numTensors}`)
  }
}
