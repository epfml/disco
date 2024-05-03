const chartOptions = {
  chart: {
    id: 'realtime',
    width: 'auto',
    height: 'auto',
    //   type: 'area',
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
    '#6096BA'
  ],
  fill: {
    colors: ['#E2E8F0'],
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
      show: true,
      formatter: function (value: number) {
        return value.toFixed(0);
      }
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
    enabled: true
  }
}

export { chartOptions }
