import { store } from '../../../store/store';
/**
 * Class that collects information about the status of the training-loop of the model.
 */
export class TrainingInformant {
  /**
   *
   * @param {Number} length the number of messages to be kept to inform the users about status of communication with other peers.
   * @param {String} task the task.
   * @param {Boolean} verbose whether or not to print messages.
   */
  constructor(length, task, verbose = false) {
    this.taskID = task.taskID;
    this.taskFeatures = task.trainingInformation.inputColumns;
    this.taskLabels = task.trainingInformation.outputColumn;

    /**
     * How much time I've been waiting for a model.
     */
    this.waitingTime = 0;

    /**
     * How much data do I own compared to the whole network.
     */
    this.dataShares = new Map();

    /**
     * Message feedback from training.
     */
    this.nbrMessagesToShow = length;
    this.messages = [];
    this.verbose = verbose;

    /**
     * Should we display the heatmap (model is using Interoperability)
     * If so what is the data (fetched from the server.)
     */
    this.displayHeatmap = false;
    this.heatmapData = null;

    // default values for the validation and training charts
    let nbEpochsOnGraphs = 10;
    this.currentValidationAccuracy = 0;
    this.validationAccuracyDataSerie = new Array(nbEpochsOnGraphs).fill(0);
    this.currentTrainingAccuracy = 0;
    this.trainingAccuracyDataSerie = new Array(nbEpochsOnGraphs).fill(0);
  }

  /**
   * Updates the time I waited to receive aggregated weights from server.
   * @param {Number} time The time I waited for.
   */
  updateWaitingTime(time) {
    this.waitingTime += time;
  }

  /**
   * Updates the number of data samples held per client.
   * @param {Map} newShares The number of data samples held per client.
   */
  updateDataShares(newShares) {
    this.dataShares = new Map(...this.dataShares, ...newShares);
  }

  /**
   * Add a new message to the message list.
   * @param {String} msg A message.
   */
  addMessage(msg) {
    const now = new Date();
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()];
    const formattedTime = time
      .map((number) => String(number).padStart(2, '0'))
      .join(':');
    if (this.messages.length >= this.nbrMessagesToShow) {
      this.messages.shift();
    }
    const message = `${formattedTime} ${msg}`;
    this.messages.push(message);
    if (this.verbose) {
      console.log(message);
    }
  }

  cssColors = (color) => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(color)
      .trim();
  };

  /**
   * Returns the colors depending on user's choice graphs should be rendered in
   */
  getColor = () => {
    return window.localStorage.getItem('color') ?? 'cyan';
  };

  colors = {
    primary: this.cssColors(`--color-${this.getColor()}`),
    primaryLight: this.cssColors(`--color-${this.getColor()}-light`),
    primaryLighter: this.cssColors(`--color-${this.getColor()}-lighter`),
    primaryDark: this.cssColors(`--color-${this.getColor()}-dark`),
    primaryDarker: this.cssColors(`--color-${this.getColor()}-darker`),
  };

  /**
   * Given the data of all clients, that we fetch from the server
   * We update the data to display on the heatmap.
   */
  updateHeatmapData(clientsData) {
    this.displayHeatmap = true;
    this.heatmapData = clientsData;
  }

  getHeatmapData() {
    console.log(this.heatmapData);
    return this.heatmapData;
  }

  /**
   * Give the defined options for the Interoperability Heatmap.
   * TODO: Make the fetching of categories dynamic.
   * @returns An object containing the options to style the heatmap.
   */
  getHeatmapOptions(inputOptions) {
    let textColor = store.state.isDark ? '#FFF' : '#000';
    let xLabels = inputOptions ? this.taskFeatures : this.taskLabels;
    console.log(xLabels)
    return {
      chart: {
        id: 'interoperability-heatmap',
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        heatmap: {
          useFillColorAsStroke: true,
          reverseNegativeShade: true,
        },
      },
      xaxis: {
        categories: xLabels,
        labels: {
          style: {
            colors: textColor,
          },
        },
        tooltip: {
          enabled: false,
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: textColor,
          },
        },
      },
      colors: [this.colors.primaryLight],
      dataLabels: {
        enabled: false,
        style: {
          colors: ['#000'],
        },
        offsetX: 30,
      },
      tooltip: {
        theme: 'dark',
        x: {
          show: false,
        },
      },
    };
  }

  /**
   * Give the defined options for the accuracy charts.
   * @returns An object containing the options to style the graphs.
   */
  getAreaChartOptions() {
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
            speed: 1000,
          },
        },
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      colors: [
        //TODO: Make it so it immediately changes when updated
        this.colors.primary,
      ],
      fill: {
        colors: [this.colors.primaryLighter],
        type: 'solid',
        opacity: 0.6,
      },
      stroke: {
        curve: 'smooth',
      },
      markers: {
        size: 0.5,
      },
      grid: {
        xaxis: {
          lines: {
            show: false,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
      },
      yaxis: {
        max: 100,
        min: 0,
        labels: {
          show: false,
        },
      },
      xaxis: {
        labels: {
          show: false,
        },
      },
      legend: {
        show: false,
      },
      tooltip: {
        enabled: false,
      },
    };
  }

  /**
   * Returns the Validation Accuracy over the last 10 epochs.
   * @returns the validation accuracy data
   */
  getValidationAccuracyData() {
    return [
      {
        data: this.validationAccuracyDataSerie,
      },
    ];
  }

  /**
   * Returns the Training Accuracy over the last 10 epochs.
   * @returns the training accuracy data
   */
  getTrainingAccuracyData() {
    return [
      {
        data: this.trainingAccuracyDataSerie,
      },
    ];
  }

  /**
   * Update the accuracy graphs data
   * @param {Number} epoch current epoch
   * @param {Number} validationAccuracy the current validation accuracy of the model
   * @param {Number} trainingAccuracy the current training accuracy of the model
   */
  updateGraph(epoch, validationAccuracy, trainingAccuracy) {
    this._updateValidationAccuracyGraph(validationAccuracy);
    this._updateTrainingAccuracygraph(trainingAccuracy);
  }

  /**
   *  Updates the data to be displayed on the validation accuracy graph.
   * @param {Number} validationAccuracy the current validation accuracy of the model
   */
  _updateValidationAccuracyGraph(validationAccuracy) {
    this.validationAccuracyDataSerie.push(validationAccuracy);
    this.validationAccuracyDataSerie.splice(0, 1);
    this.currentValidationAccuracy = validationAccuracy;
  }

  /**
   *  Updates the data to be displayed on the training accuracy graph.
   * @param {Number} trainingAccuracy the current training accuracy of the model
   */
  _updateTrainingAccuracygraph(trainingAccuracy) {
    this.trainingAccuracyDataSerie.push(trainingAccuracy);
    this.trainingAccuracyDataSerie.splice(0, 1);
    this.currentTrainingAccuracy = trainingAccuracy;
  }
}
