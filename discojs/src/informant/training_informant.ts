import { List, Set } from 'immutable'
import { TaskID, TrainingSchemes } from '..'
import { GraphInformant } from '.'

/**
 * Class that collects information about the status of the training-loop of the model.
 */
export class TrainingInformant {
  // Decentralized Informations
  // number of people with whom I've shared my model
  whoReceivedMyModel = Set()
  nbrUpdatesWithOthers: number
  waitingTime: number
  nbrWeightRequests: number
  // message feedback from peer-to-peer training
  messages = List()
  // federated scheme
  currentRound: number
  currentNumberOfParticipants: number
  totalNumberOfParticipants: number
  averageNumberOfParticipants: number
  // Common Informations
  private readonly trainingGraphInformant: GraphInformant
  private readonly validationGraphInformant: GraphInformant
  displayHeatmap: boolean
  weightsIn = 0
  weightsOut = 0

  /**
   *
   * @param nbrMessagesToShow the number of messages to be kept to inform the users about status of communication with other peers.
   * @param taskID the task's name.
   */
  constructor (
    private readonly nbrMessagesToShow: number,
    public readonly taskID: TaskID,
    public readonly taskTrainingScheme: TrainingSchemes
  ) {
    // how many times the model has been averaged with someone's else model
    this.nbrUpdatesWithOthers = 0

    // how much time I've been waiting for a model
    this.waitingTime = 0

    // number of weight requests I've responded to
    this.nbrWeightRequests = 0

    // statistics received from the server
    this.currentRound = 0
    this.currentNumberOfParticipants = 0
    this.totalNumberOfParticipants = 0
    this.averageNumberOfParticipants = 0

    // graph informants
    this.trainingGraphInformant = new GraphInformant()
    this.validationGraphInformant = new GraphInformant()

    // is the model using Interoperability (default to false)
    this.displayHeatmap = false
  }

  /**
   * Updates the set of peers who received my model.
   * @param {String} peerName the peer's name to whom I recently shared my model to.
   */
  updateWhoReceivedMyModel (peerName: string): void {
    this.whoReceivedMyModel = this.whoReceivedMyModel.add(peerName)
  }

  /**
   * Updates the number of updates I did with other peers.
   * @param {Number} nbrUpdates the number of updates I did thanks to other peers contribution since the last update of the parameter.
   */
  updateNbrUpdatesWithOthers (nbrUpdates: number): void {
    this.nbrUpdatesWithOthers += nbrUpdates
  }

  /**
   * Updates the time I waited to receive weights.
   * @param {Number} time
   */
  updateWaitingTime (time: number): void {
    this.waitingTime += time
  }

  /**
   * Updates the number of weights request I received.
   * @param {Number} nbrRequests the number of weight requests I received since the last update of the parameter.
   */
  updateNbrWeightsRequests (nbrRequests: number): void {
    this.nbrWeightRequests += nbrRequests
  }

  /**
   * Add a new message to the message list.
   * @param {String} msg a message.
   */
  addMessage (msg: string): void {
    if (this.messages.size >= this.nbrMessagesToShow) {
      this.messages = this.messages.shift()
    }
    this.messages = this.messages.push(msg)
  }

  /**
   * Update the server statistics with the JSON received from the server
   * For now it's just the JSON, but we might want to keep it as a dictionnary
   * @param {any} receivedStatistics statistics received from the server.
   */
  updateWithServerStatistics (receivedStatistics: Record<string, number>): void {
    this.currentRound = receivedStatistics.round
    this.currentNumberOfParticipants = receivedStatistics.currentNumberOfParticipants
    this.totalNumberOfParticipants = receivedStatistics.totalNumberOfParticipants
    this.averageNumberOfParticipants = receivedStatistics.averageNumberOfParticipants
  }

  updateTrainingGraph (accuracy: number): void {
    this.trainingGraphInformant.updateAccuracy(accuracy)
  }

  /**
   *  Updates the data to be displayed on the validation accuracy graph.
   * @param {number} accuracy the current validation accuracy of the model
   */
  updateValidationGraph (accuracy: number): void {
    this.validationGraphInformant.updateAccuracy(accuracy)
  }

  trainingAccuracy (): number {
    return this.trainingGraphInformant.accuracy()
  }

  validationAccuracy (): number {
    return this.validationGraphInformant.accuracy()
  }

  trainingAccuracyData (): List<number> {
    return this.trainingGraphInformant.data()
  }

  validationAccuracyData (): List<number> {
    return this.validationGraphInformant.data()
  }

  /**
   * Returns wether or not the Task's training scheme is Decentralized
   * @returns Boolean value
   */
  isTaskTrainingSchemeDecentralized (): boolean {
    return this.taskTrainingScheme === TrainingSchemes.DECENTRALIZED
  }

  /**
   * Returns wether or not the Task's training scheme is Federated
   * @returns Boolean value
   */
  isTaskTrainingSchemeFederated (): boolean {
    return this.taskTrainingScheme === TrainingSchemes.FEDERATED
  }
}
