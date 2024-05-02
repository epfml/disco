export interface Logger {
  /**
   * Logs sucess message (in green)
   * @param message - message to be displayed
   */
  success(message: string): void;
  /**
   * Logs error message (in red)
   * @param message - message to be displayed
   */
  error(message: string): void;
}
