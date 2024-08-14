export type TrainingStatus =
  "Waiting for more participants" |
  "Updating the model with other participants' models" |
  "Training the model on the data you connected"

export interface Logger {
  /**
   * Logs success message (in green)
   * @param message - message to be displayed
   */
  success(message: string): void;
  /**
   * Logs error message (in red)
   * @param message - message to be displayed
   */
  error(message: string): void;
  /**
   * Displays the current training status
   * @param status training status to display
   * e.g., 'Waiting for more participants', 'Training locally', 'Updating the model'
   */
  setStatus(status: TrainingStatus): void;
}
