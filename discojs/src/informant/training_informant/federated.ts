import { Base } from '.'

/**
 * Class that collects information about the status of the training-loop of the model.
 */
export class FederatedInformant extends Base {
  displayHeatmap = false

  /**
   * Update the server statistics with the JSON received from the server
   * For now it's just the JSON, but we might want to keep it as a dictionary
   * @param receivedStatistics statistics received from the server.
   */
  update (receivedStatistics: Record<string, number>): void {
    this.currentRound = receivedStatistics.round
    this.currentNumberOfParticipants = receivedStatistics.currentNumberOfParticipants
    this.totalNumberOfParticipants = receivedStatistics.totalNumberOfParticipants
    this.averageNumberOfParticipants = receivedStatistics.averageNumberOfParticipants
  }

  isFederated (): boolean {
    return true
  }
}
