import chalk from 'chalk';
/**
 * Same properties as Toaster but on the console
 *
 * @class Logger
 */
class Logger {
  success(message) {
    console.log(chalk.green(message));
  }

  error(message) {
    console.log(chalk.red(message));
  }
}

export const logger = new Logger();
