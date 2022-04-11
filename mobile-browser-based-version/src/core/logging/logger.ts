
export abstract class Logger {
  /**
   *
   * Logs success message (in green)
   * @param {String} message - message to be displayed
   */
  abstract success (message: string): void

  /**
   * Logs error message (in red)
   * @param {String} message - message to be displayed
   */
  abstract error (message: string): void

  /**
   * Logs information message
   * @param {String} message - message to be displayed
   */
  abstract information (message: string): void
}
