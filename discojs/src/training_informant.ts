interface DataSerie {
  data: number[]
}

/**
 * Class that collects information about the status of the training-loop of the model.
 */
export class TrainingInformant {
  taskID: string;
  // Decentralized Informations
  whoReceivedMyModel: Set<unknown>;
  nbrUpdatesWithOthers: number;
  waitingTime: number;
  nbrWeightRequests: number;
  nbrMessagesToShow: number;
  messages: string[];
  // Federated Informations
  currentRound: number;
  currentNumberOfParticipants: number;
  totalNumberOfParticipants: number;
  averageNumberOfParticipants : number;
  // Common Informations
  validationAccuracyChart: unknown;
  validationAccuracy: number;
  trainingAccuracyChart: unknown;
  trainingAccuracy: number;
  displayHeatmap: boolean;
  currentValidationAccuracy: number;
  validationAccuracyDataSerie: number[];
  currentTrainingAccuracy: number;
  trainingAccuracyDataSerie: number[];
  weightsIn: number;
  biasesIn: number;
  weightsOut: number;
  biasesOut: number;

  /**
   *
   * @param {Number} length the number of messages to be kept to inform the users about status of communication with other peers.
   * @param {String} taskID the task's name.
   */
  constructor (length: number, taskID: string) {
    this.taskID = taskID
    // number of people with whom I've shared my model
    this.whoReceivedMyModel = new Set()

    // how many times the model has been averaged with someone's else model
    this.nbrUpdatesWithOthers = 0

    // how much time I've been waiting for a model
    this.waitingTime = 0

    // number of weight requests I've responded to
    this.nbrWeightRequests = 0

    // message feedback from peer-to-peer training
    this.nbrMessagesToShow = length
    this.messages = []

    // statistics received from the server

    this.currentRound = 0
    this.currentNumberOfParticipants = 0
    this.totalNumberOfParticipants = 0
    this.averageNumberOfParticipants = 0

    // validation accuracy chart
    this.validationAccuracyChart = null // new TrainingChart("validationAccuracy_".concat(taskID), "Validation Accuracy")
    this.validationAccuracy = 0

    // training accuracy chart
    this.trainingAccuracyChart = null // new TrainingChart("trainingAccuracy_".concat(taskID), "Training Accuracy")
    this.trainingAccuracy = 0

    // is the model using Interoperability (default to false)
    this.displayHeatmap = false

    // default values for the validation and training charts
    const nbEpochsOnGraphs = 10
    this.currentValidationAccuracy = 0
    this.validationAccuracyDataSerie = new Array(nbEpochsOnGraphs).fill(0)
    this.currentTrainingAccuracy = 0
    this.trainingAccuracyDataSerie = new Array(nbEpochsOnGraphs).fill(0)
  }

  /**
   * Updates the set of peers who received my model.
   * @param {String} peerName the peer's name to whom I recently shared my model to.
   */
  updateWhoReceivedMyModel (peerName: string): void {
    this.whoReceivedMyModel.add(peerName)
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
    if (this.messages.length >= this.nbrMessagesToShow) {
      this.messages.shift()
    }
    this.messages.push(msg)
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

  /**
   * Returns the Validation Accuracy over the last 10 epochs.
   * @returns the validation accuracy data
   */
  getValidationAccuracyData (): DataSerie[] {
    return [
      {
        data: this.validationAccuracyDataSerie
      }
    ]
  }

  /**
   * Returns the Training Accuracy over the last 10 epochs.
   * @returns the training accuracy data
   */
  getTrainingAccuracyData (): DataSerie[] {
    return [
      {
        data: this.trainingAccuracyDataSerie
      }
    ]
  }

  /**
   *  Updates the data to be displayed on the validation accuracy graph.
   * @param {Number} validationAccuracy the current validation accuracy of the model
   */
  updateValidationAccuracyGraph (validationAccuracy: number): void {
    this.validationAccuracyDataSerie.push(validationAccuracy)
    this.validationAccuracyDataSerie.splice(0, 1)
    this.currentValidationAccuracy = validationAccuracy
  }

  /**
   *  Updates the data to be displayed on the training accuracy graph.
   * @param {Number} trainingAccuracy the current training accuracy of the model
   */
  updateTrainingAccuracyGraph (trainingAccuracy: number): void {
    this.trainingAccuracyDataSerie.push(trainingAccuracy)
    this.trainingAccuracyDataSerie.splice(0, 1)
    this.currentTrainingAccuracy = trainingAccuracy
  }
}
