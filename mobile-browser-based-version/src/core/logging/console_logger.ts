import chalk from 'chalk'
import { Logger } from './logger'
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
   * @param {String} message - message to be displayed
   */
  error (message: string): void {
    console.log(chalk.red(message))
  }

  /**
   * Logs information message on the console (in gray)
   * @param {String} message - message to be displayed
   */
  information (message: string): void {
    console.log(chalk.gray(message))
  }
}

// creates logger object
export const logger = new ConsoleLogger()
