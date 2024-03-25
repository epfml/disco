import chalk from 'chalk'
import { Logger } from './logger.js'

/**
 * Same properties as Toaster but on the console
 *
 * @class Logger
 */
export class ConsoleLogger extends Logger {
  /**
   * Logs success message on the console (in green)
   * @param {String} message - message to be displayed
   */
  success (message: string): void {
    console.log(chalk.green(message))
  }

  /**
   * Logs error message on the console (in red)
   * @param message - message to be displayed
   */
  error (message: string): void {
    console.log(chalk.red(message))
  }
}
