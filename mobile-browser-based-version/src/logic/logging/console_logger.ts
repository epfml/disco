import chalk from 'chalk'
import { Logger } from './logger'
/**
 * Same properties as Toaster but on the console
 *
 * @class Logger
 */
class ConsoleLogger extends Logger {
  /**
   * Logs success message on the console (in green)
   * @param {String} message - message to be displayed
   */
  success (message) {
    console.log(chalk.green(message))
  }

  /**
   * Logs error message on the console (in red)
   * @param {String} message - message to be displayed
   */
  error (message) {
    console.log(chalk.red(message))
  }
}

// creates logger object
export const logger = new ConsoleLogger()
