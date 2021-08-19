import * as Chart from 'chart.js';

export class TrainingChart {
  constructor(codeName, displayName) {
    /**
     * Returns the CSS colors graphs should be rendered in
     */
    const cssColors = color => {
      return getComputedStyle(document.documentElement).getPropertyValue(color);
    };

    /**
     * Returns the colors depending on user's choice graphs should be rendered in
     */
    const getColor = () => {
      return window.localStorage.getItem('color') ?? 'cyan';
    };

    // Initilization of the color's constant
    // TO DO: add listeners to modify color when changement added
    const colors = {
      primary: cssColors(`--color-${getColor()}`),
      primaryLight: cssColors(`--color-${getColor()}-light`),
      primaryLighter: cssColors(`--color-${getColor()}-lighter`),
      primaryDark: cssColors(`--color-${getColor()}-dark`),
      primaryDarker: cssColors(`--color-${getColor()}-darker`),
    };

    // code name of the graph
    this.codeName = codeName;

    // display name of the graph
    this.displayName = displayName;

    // current measure
    this.currentMeasure = document.getElementById('val_'.concat(codeName));

    this.graph = new Chart(document.getElementById('chart_'.concat(codeName)), {
      type: 'line',
      data: {
        labels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        datasets: [
          {
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            backgroundColor: colors.primary,
            borderWidth: 0,
            categoryPercentage: 1,
          },
        ],
      },
      options: {
        scales: {
          yAxes: [
            {
              display: false,
              gridLines: false,
              // comment ticks to remove chart auto scale
              ticks: {
                min: 0,
                max: 100,
              },
            },
          ],
          xAxes: [
            {
              display: false,
              gridLines: false,
            },
          ],
          ticks: {
            padding: 10,
          },
        },
        cornerRadius: 2,
        maintainAspectRatio: false,
        legend: {
          display: false,
        },
        tooltips: {
          prefix: displayName,
          bodySpacing: 4,
          footerSpacing: 4,
          hasIndicator: true,
          mode: 'index',
          intersect: true,
        },
        hover: {
          mode: 'nearest',
          intersect: true,
        },
      },
    });
  }

  /**
   * Method to update tha measurement of the chart
   * @param {Number} epoch The step of the measurment (eg. the training epoch number)
   * @param {Number} newMeasure The new measurement to (eg. the training accuracy)
   */
  async updateGraph(step, newMeasure) {
    this.graph.data.datasets[0].data.push(newMeasure);
    this.graph.data.datasets[0].data.splice(0, 1);
    this.graph.data.labels.push('Epoch '.concat(String(step)));
    this.graph.data.labels.splice(0, 1);
    await this.graph.update();
    this.currentMeasure.innerText = newMeasure;
  }
}
