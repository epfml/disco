
export abstract class Logger {
  /**
   * Logs sucess message (in green)
   * @param {String} message - message to be displayed
   */
  abstract success (message: string)
  /**
   * Logs error message (in red)
   * @param {String} message - message to be displayed
   */
  abstract error (message: string)
}