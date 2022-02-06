import chalk from 'chalk';
/**
 * Same properties as Toaster but on the console
 *
 * @class Logger
 */
class Logger {
  /**
   * Logs sucess message on the console (in green)
   * @param {String} message - message to be displayed
   */
  success(message) {
    console.log(chalk.green(message));
  }
  /**
   * Logs error message on the console (in red)
   * @param {String} message - message to be displayed
   */
  error(message) {
    console.log(chalk.red(message));
  }
}

// creates logger object
export const logger = new Logger();
