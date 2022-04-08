import chalk from 'chalk'
import { Logger } from '../../src/core/logging/logger'

export interface LoggerResult {
  trainAccuracy: number[]
  validationAccuracy: number[]
}

/**
 * Class that is used to log the training data of a user.
 */
export class BenchmarkLogger extends Logger {
  log: string[]
  loggerResult: LoggerResult

  constructor () {
    super()
    this.loggerResult = {
      trainAccuracy: [],
      validationAccuracy: []
    }
  }

  private formatAccuracy (message: string): number {
    const trainAccuracy = message.split(':')[1].trim()
    return parseFloat(trainAccuracy)
  }

  /**
   * Logs success message on the console (in green)
   * @param {String} message - message to be displayed
   */
  success (message: string) {
    if (message.includes('train')) {
      const accuracy = this.formatAccuracy(message)
      this.loggerResult.trainAccuracy.push(accuracy)
    }
    if (message.includes('validation')) {
      const accuracy = this.formatAccuracy(message)
      this.loggerResult.validationAccuracy.push(accuracy)
    }
  }

  /**
   * Logs error message on the console (in red)
   * @param {String} message - message to be displayed
   */
  error (message: string) {
    console.log(chalk.red(message))
  }
}
