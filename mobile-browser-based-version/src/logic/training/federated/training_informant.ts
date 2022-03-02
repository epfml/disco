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
  dataShares: Map<any, any>;
  verbose: boolean;

  /**
   *
   * @param {Number} length the number of messages to be kept to inform the users about status of communication with other peers.
   * @param {String} taskID the task's name.
   * @param {Boolean} verbose whether or not to print messages.
   */
  constructor (length, taskID, verbose = false) {
    this.taskID = taskID

    /**
     * How much time I've been waiting for a model.
     */
    this.waitingTime = 0

    /**
     * How much data do I own compared to the whole network.
     */
    this.dataShares = new Map()

    /**
     * Message feedback from training.
     */
    this.nbrMessagesToShow = length
    this.messages = []
    this.verbose = verbose

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
   * Updates the time I waited to receive aggregated weights from server.
   * @param {Number} time The time I waited for.
   */
  updateWaitingTime (time) {
    this.waitingTime += time
  }

  /**
   * Updates the number of data samples held per client.
   * @param {Map} newShares The number of data samples held per client.
   */
  updateDataShares (newShares) {
    this.dataShares = new Map(...this.dataShares, ...newShares)
  }

  /**
   * Add a new message to the message list.
   * @param {String} msg A message.
   */
  addMessage (msg) {
    const now = new Date()
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    const formattedTime = time
      .map((number) => String(number).padStart(2, '0'))
      .join(':')
    if (this.messages.length >= this.nbrMessagesToShow) {
      this.messages.shift()
    }
    const message = `${formattedTime} ${msg}`
    this.messages.push(message)
    if (this.verbose) {
      console.log(message)
    }
  }

  cssColors = (color) => {
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

  colors = {
    primary: this.cssColors(`--color-${this.getColor()}`),
    primaryLight: this.cssColors(`--color-${this.getColor()}-light`),
    primaryLighter: this.cssColors(`--color-${this.getColor()}-lighter`),
    primaryDark: this.cssColors(`--color-${this.getColor()}-dark`),
    primaryDarker: this.cssColors(`--color-${this.getColor()}-darker`)
  };

  /**
   * Update the Heatmap for Interoperability.
   */
  updateHeatmapData (weightsIn, biasesIn, weightsOut, biasesOut) {
    this.displayHeatmap = true
    this.weightsIn = weightsIn
    this.biasesIn = biasesIn
    this.weightsOut = weightsOut
    this.biasesOut = biasesOut
  }

  /**
   * Give the defined options for the Interoperability Heatmap.
   * TODO: Make the fetching of categories dynamic.
   * @returns An object containing the options to style the heatmap.
   */
  getHeatmapOptions () {
    return {
      colors: [this.colors.primaryLight],
      dataLabels: {
        enabled: true,
        style: {
          colors: ['#FFF']
        },
        offsetX: 30
      },
      chart: {
        id: 'vuechart-example'
      },
      plotOptions: {
        heatmap: {
          colorScale: {
            min: 0.8,
            max: 1.2
          }
        }
      },
      xaxis: {
        categories: ['Id', 'Age', 'SibSp', 'Parch', 'Fare', 'Pclass'],
        labels: {
          style: {
            colors: '#FFF'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#FFF'
          }
        }
      }
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
        this.colors.primary
      ],
      fill: {
        colors: [this.colors.primaryLighter],
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
  getValidationAccuracyData () {
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
  getTrainingAccuracyData () {
    return [
      {
        data: this.trainingAccuracyDataSerie
      }
    ]
  }

  /**
   * Update the accuracy graphs data
   * @param {Number} epoch current epoch
   * @param {Number} validationAccuracy the current validation accuracy of the model
   * @param {Number} trainingAccuracy the current training accuracy of the model
   */
  updateGraph (validationAccuracy, trainingAccuracy) {
    this._updateValidationAccuracyGraph(validationAccuracy)
    this._updateTrainingAccuracyGraph(trainingAccuracy)
  }

  /**
   *  Updates the data to be displayed on the validation accuracy graph.
   * @param {Number} validationAccuracy the current validation accuracy of the model
   */
  _updateValidationAccuracyGraph (validationAccuracy) {
    this.validationAccuracyDataSerie.push(validationAccuracy)
    this.validationAccuracyDataSerie.splice(0, 1)
    this.currentValidationAccuracy = validationAccuracy
  }

  /**
   *  Updates the data to be displayed on the training accuracy graph.
   * @param {Number} trainingAccuracy the current training accuracy of the model
   */
  _updateTrainingAccuracyGraph (trainingAccuracy) {
    this.trainingAccuracyDataSerie.push(trainingAccuracy)
    this.trainingAccuracyDataSerie.splice(0, 1)
    this.currentTrainingAccuracy = trainingAccuracy
  }
}
