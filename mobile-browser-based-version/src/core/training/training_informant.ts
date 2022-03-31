
type DataSerie = {
  data: number[];
};

/**
 * Class that collects information about the status of the training-loop of the model.
 */
export class TrainingInformant {
  taskID: string;
  whoReceivedMyModel: Set<unknown>;
  nbrUpdatesWithOthers: number;
  waitingTime: number;
  nbrWeightRequests: number;
  nbrMessagesToShow: number;
  messages: any[];
  serverStatistics: any; // Check the type, for now it's a JSON object
  validationAccuracyChart: any;
  validationAccuracy: number;
  trainingAccuracyChart: any;
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
    this.serverStatistics = null

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
  updateWhoReceivedMyModel (peerName: string) {
    this.whoReceivedMyModel.add(peerName)
  }

  /**
   * Updates the number of updates I did with other peers.
   * @param {Number} nbrUpdates the number of updates I did thanks to other peers contribution since the last update of the parameter.
   */
  updateNbrUpdatesWithOthers (nbrUpdates: number) {
    this.nbrUpdatesWithOthers += nbrUpdates
  }

  /**
   * Updates the time I waited to receive weights.
   * @param {Number} time
   */
  updateWaitingTime (time: number) {
    this.waitingTime += time
  }

  /**
   * Updates the number of weights request I received.
   * @param {Number} nbrRequests the number of weight requests I received since the last update of the parameter.
   */
  updateNbrWeightsRequests (nbrRequests: number) {
    this.nbrWeightRequests += nbrRequests
  }

  /**
   * Add a new message to the message list.
   * @param {String} msg a message.
   */
  addMessage (msg: string) {
    if (this.messages.length >= this.nbrMessagesToShow) {
      this.messages.shift()
    }
    this.messages.push(msg)
  }

  /**
   * Update the server statistics with the JSON received from the server
   * For now it's just the JSON, but we might want to keep it as a dictionnary
   * @param {String} msg a message.
   */
  updateServerStatistics (receivedStatistics: any) {
    this.serverStatistics = JSON.parse(receivedStatistics)
    console.log('Received Stats :', this.serverStatistics)
  }

  cssColors = (color: string) => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(color)
      .trim()
  };

  /**
   * Returns the colors depending on user's choice graphs should be rendered in
   */
  getColor = () => {
    return window.localStorage.getItem('color') ?? 'cyan'
  };

  /**
   * Returns color palette
   */
  getColorPalette () {
    return {
      primary: this.cssColors(`--color-${this.getColor()}`),
      primaryLight: this.cssColors(`--color-${this.getColor()}-light`),
      primaryLighter: this.cssColors(`--color-${this.getColor()}-lighter`),
      primaryDark: this.cssColors(`--color-${this.getColor()}-dark`),
      primaryDarker: this.cssColors(`--color-${this.getColor()}-darker`)
    }
  }

  /**
   * Give the defined options for the accuracy charts.
   * @returns An object containing the options to style the graphs.
   */
  getAreaChartOptions () {
    return {
      chart: {
        id: 'realtime',
        width: 'auto',
        height: 'auto',
        type: 'area',
        animations: {
          enabled: true,
          easing: 'linear',
          dynamicAnimation: {
            speed: 1000
          }
        },
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      dataLabels: {
        enabled: false
      },
      colors: [
        // TODO: Make it so it immediately changes when updated
        this.getColorPalette().primary
      ],
      fill: {
        colors: [this.getColorPalette().primaryLighter],
        type: 'solid',
        opacity: 0.6
      },
      stroke: {
        curve: 'smooth'
      },
      markers: {
        size: 0.5
      },
      grid: {
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: false
          }
        }
      },
      yaxis: {
        max: 100,
        min: 0,
        labels: {
          show: false
        }
      },
      xaxis: {
        labels: {
          show: false
        }
      },
      legend: {
        show: false
      },
      tooltip: {
        enabled: false
      }
    }
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
  updateValidationAccuracyGraph (validationAccuracy: number) {
    this.validationAccuracyDataSerie.push(validationAccuracy)
    this.validationAccuracyDataSerie.splice(0, 1)
    this.currentValidationAccuracy = validationAccuracy
  }

  /**
   *  Updates the data to be displayed on the training accuracy graph.
   * @param {Number} trainingAccuracy the current training accuracy of the model
   */
  updateTrainingAccuracyGraph (trainingAccuracy: number) {
    this.trainingAccuracyDataSerie.push(trainingAccuracy)
    this.trainingAccuracyDataSerie.splice(0, 1)
    this.currentTrainingAccuracy = trainingAccuracy
  }
}
