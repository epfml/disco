<template>
  <div>
    <div
      x-transition:enter="transition duration-300 ease-in-out"
      x-transition:enter-start="opacity-0"
      x-transition:enter-end="opacity-100"
      x-ref="trainingBoard"
      x-show="isTraining"
    >
      <div class="grid grid-cols-2 p-4 gap-8">
        <!-- Validation Accuracy users chart -->
        <div class="bg-white rounded-md">
          <!-- Card header -->
          <div class="p-4 border-b">
            <h4 class="text-lg font-semibold text-slate-500">
              {{
                $t('training.trainingInformationFrame.accuracyCharts.validationAccuracyHeader')
              }}
            </h4>
          </div>
          <p class="p-4">
            <span class="text-2xl font-medium text-slate-500">{{
              currentValidationAccuracy
            }}</span>
            <span class="text-sm font-medium text-slate-500 dark:text-primary">
              {{
                $t('training.trainingInformationFrame.accuracyCharts.validationAccuracyText')
              }}
            </span>
          </p>
          <!-- Chart -->
          <div class="relative p-4 w-100% h-100%">
            <apexchart
              width="100%"
              height="200"
              type="area"
              :options="areaChartOptions"
              :series="validationAccuracyData"
            />
          </div>
        </div>

        <!-- Training Accuracy users chart -->
        <div class="bg-white rounded-md">
          <!-- Card header -->
          <div class="p-4 border-b dark:border-primary">
            <h4 class="text-lg font-semibold text-slate-500">
              {{
                $t('training.trainingInformationFrame.accuracyCharts.trainingAccuracyHeader')
              }}
            </h4>
          </div>
          <p class="p-4">
            <span class="text-2xl font-medium text-slate-500 dark:text-light">{{
              currentTrainingAccuracy
            }}</span>
            <span class="text-sm font-medium text-slate-500 dark:text-primary">
              {{
                $t('training.trainingInformationFrame.accuracyCharts.trainingAccuracyText')
              }}
            </span>
          </p>
          <!-- Chart -->
          <div class="relative p-4 w-100% h-100%">
            <apexchart
              width="100%"
              height="200"
              type="area"
              :options="areaChartOptions"
              :series="trainingAccuracyData"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Communication Console -->
    <icon-card :header="$t('training.trainingInformationFrame.trainingInformations.trainingConsoleHeader')">
      <template #icon>
        <contact />
      </template>
      <template #extra>
        <div id="mapHeader">
          <ul class="grid grid-cols-1 p-4">
            <li
              v-for="(message, index) in trainingInformant.messages"
              :key="index"
              class="border-slate-400"
            >
              <div class="relative overflow-x-hidden">
                <span
                  style="white-space: pre-line"
                  class="text-sm text-slate-500 dark:text-light"
                >{{ message }}</span>
              </div>
            </li>
          </ul>
        </div>
      </template>
    </icon-card>

    <!-- Distributed Training Information -->
    <div
      v-if="isDecentralizedTrainingScheme"
      class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-2 xl:grid-cols-4"
    >
      <!-- Number of time model updated with someone else's model card -->
      <IconCardSmall
        :header="$t('training.trainingInformationFrame.trainingInformations.distributed.averaging')"
        :description="String(trainingInformant.nbrUpdatesWithOthers)"
      >
        <performances />
      </IconCardSmall>

      <!-- How much time I've been waiting for weights to arrive -->
      <IconCardSmall
        :header="$t('training.trainingInformationFrame.trainingInformations.distributed.waitingTime')"
        :description="`${trainingInformant.waitingTime} sec`"
      >
        <timer />
      </IconCardSmall>

      <!-- Nbr. of Weight Requests -->
      <IconCardSmall
        :header="$t('training.trainingInformationFrame.trainingInformations.distributed.weightRequests')"
        :description="String(trainingInformant.nbrWeightRequests)"
      >
        <forward />
      </IconCardSmall>

      <!-- Nbr. of people helped -->
      <IconCardSmall
        :header="$t('training.trainingInformationFrame.trainingInformations.distributed.peopleHelped')"
        :description="String(trainingInformant.whoReceivedMyModel.size)"
      >
        <people />
      </IconCardSmall>
    </div>
    <!-- Federated Training Information -->
    <div
      v-else
      class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-2 xl:grid-cols-4"
    >
      <!-- Current Round -->
      <IconCardSmall
        :header="$t('training.trainingInformationFrame.trainingInformations.federated.round')"
        :description="String(trainingInformant.currentRound)"
      >
        <timer />
      </IconCardSmall>

      <!-- Current Number of Participants -->
      <IconCardSmall
        :header="$t('training.trainingInformationFrame.trainingInformations.federated.numberParticipants')"
        :description="String(trainingInformant.currentNumberOfParticipants)"
      >
        <people />
      </IconCardSmall>

      <!-- Average Number of Participants -->
      <IconCardSmall
        :header="$t('training.trainingInformationFrame.trainingInformations.federated.averageParticipants')"
        :description="String(trainingInformant.averageNumberOfParticipants)"
      >
        <people />
      </IconCardSmall>
    </div>
  </div>
</template>

<script lang="ts">
import { TrainingInformant } from 'discojs'

import IconCardSmall from '@/components/containers/IconCardSmall.vue'
import IconCard from '@/components/containers/IconCard.vue'
import Timer from '@/assets/svg/Timer.vue'
import People from '@/assets/svg/People.vue'
import Performances from '@/assets/svg/Performances.vue'
import Forward from '@/assets/svg/Forward.vue'
import Contact from '@/assets/svg/Contact.vue'

export default {
  name: 'TrainingInformation',
  components: {
    IconCardSmall,
    IconCard,
    Timer,
    People,
    Performances,
    Forward,
    Contact
  },
  props: {
    trainingInformant: {
      type: TrainingInformant,
      default: undefined
    }
  },
  data () {
    // TODO copied from ImageTestingFrame
    const getColor = () => {
      return window.localStorage.getItem('color') ?? 'cyan'
    }

    const cssColors = (color: string): string => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(color)
        .trim()
    }

    const colorPalette = {
      primary: cssColors(`--color-${getColor()}`),
      primaryLight: cssColors(`--color-${getColor()}-light`)
    }

    const areaChartOptions = {
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
        colorPalette.primary
      ],
      fill: {
        colors: [colorPalette.primaryLight],
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

    return {
      areaChartOptions,
      isDecentralizedTrainingScheme: this.trainingInformant.isTaskTrainingSchemeDecentralized()
    }
  },

  computed: {
    displayHeatmap () {
      return this.trainingInformant.displayHeatmap
    },
    interoperabilityHeatmapData () {
      // TODO: cahnge once the peers exchange actual data of their weights and biases.
      return [
        {
          name: 'You',
          data: this.trainingInformant.weightsIn
        }
      ]
    },
    currentTrainingAccuracy () {
      return this.trainingInformant.currentTrainingAccuracy
    },
    currentValidationAccuracy () {
      return this.trainingInformant.currentValidationAccuracy
    },
    trainingAccuracyData () {
      return [
        {
          data: this.trainingInformant.trainingAccuracyDataSerie.toArray()
        }
      ]
    },
    validationAccuracyData () {
      return [
        {
          data: this.trainingInformant.validationAccuracyDataSerie.toArray()
        }
      ]
    }
  }
}
</script>
