export abstract class Logger {
  /**
   * Logs sucess message (in green)
   * @param message - message to be displayed
   */
  abstract success (message: string): void
  /**
   * Logs error message (in red)
   * @param message - message to be displayed
   */
  abstract error (message: string): void
}
