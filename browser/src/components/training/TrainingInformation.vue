<template>
  <div>
    <div
      x-transition:enter="transition duration-300 ease-in-out"
      x-transition:enter-start="opacity-0"
      x-transition:enter-end="opacity-100"
      x-ref="trainingBoard"
      x-show="isTraining"
    >
      <div
        class="grid p-4 gap-8"
        :class="hasValidationData ? 'grid-cols-2' : 'grid-cols-1'"
      >
        <!-- Validation Accuracy users chart -->
        <div
          v-if="hasValidationData"
          class="bg-white rounded-md basis-0"
        >
          <!-- Card header -->
          <div class="p-4 border-b">
            <h4 class="text-lg font-semibold text-slate-500">
              {{
                $t('training.trainingInformationFrame.accuracyCharts.validationAccuracyHeader')
              }}
            </h4>
          </div>
          <p class="p-4">
            <span class="text-2xl font-medium text-slate-500">
              {{ currentValidationAccuracy }}
            </span>
            <span class="text-sm font-medium text-slate-500">
              {{
                $t('training.trainingInformationFrame.accuracyCharts.validationAccuracyText')
              }}
            </span>
          </p>
          <!-- Chart -->
          <div class="relative p-4 w-full h-full">
            <apexchart
              width="100%"
              height="200"
              type="area"
              :options="chartOptions"
              :series="validationAccuracyData"
            />
          </div>
        </div>

        <!-- Training Accuracy users chart -->
        <div class="bg-white rounded-md basis-0">
          <!-- Card header -->
          <div class="p-4 border-b">
            <h4 class="text-lg font-semibold text-slate-500">
              {{
                $t('training.trainingInformationFrame.accuracyCharts.trainingAccuracyHeader')
              }}
            </h4>
          </div>
          <p class="p-4">
            <span class="text-2xl font-medium text-slate-500">
              {{ currentTrainingAccuracy }}
            </span>
            <span class="text-sm font-medium text-slate-500">
              {{
                $t('training.trainingInformationFrame.accuracyCharts.trainingAccuracyText')
              }}
            </span>
          </p>
          <!-- Chart -->
          <div class="relative p-4 w-full h-full">
            <apexchart
              width="100%"
              height="200"
              type="area"
              :options="chartOptions"
              :series="trainingAccuracyData"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Communication Console -->
    <IconCard v-if="isDistributedTrainingScheme">
      <template #title>
        {{ $t('training.trainingInformationFrame.trainingInformations.trainingConsoleHeader') }}
      </template>
      <template #icon>
        <Contact />
      </template>
      <template #content>
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
                  class="text-sm text-slate-500"
                >{{ message }}</span>
              </div>
            </li>
          </ul>
        </div>
      </template>
    </IconCard>

    <div class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-2 xl:grid-cols-4">
      <IconCardSmall>
        <template #header>
          Current round
        </template>
        <template #text>
          {{ trainingInformant.currentRound }}
        </template>
        <template #icon>
          <Timer />
        </template>
      </IconCardSmall>
      <IconCardSmall>
        <template #header>
          Current # of participants
        </template>
        <template #text>
          {{ trainingInformant.currentNumberOfParticipants }}
        </template>
        <template #icon>
          <People />
        </template>
      </IconCardSmall>
      <IconCardSmall>
        <template #header>
          Average # of participants
        </template>
        <template #text>
          {{ trainingInformant.averageNumberOfParticipants }}
        </template>
        <template #icon>
          <People />
        </template>
      </IconCardSmall>

      <div
        v-if="isDecentralizedTrainingScheme"
        class="contents"
      >
        <IconCardSmall>
          <template #header>
            Waiting time
          </template>
          <template #text>
            {{ trainingInformant.waitingTime }} seconds
          </template>
          <template #icon>
            <Timer />
          </template>
        </IconCardSmall>
        <IconCardSmall>
          <template #header>
            # of weights requests
          </template>
          <template #text>
            {{ trainingInformant.nbrWeightRequests }}
          </template>
          <template #icon>
            <Forward />
          </template>
        </IconCardSmall>
      </div>
    <!-- Federated Training Information -->
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { TrainingInformant } from 'discojs'

import IconCardSmall from '@/components/containers/IconCardSmall.vue'
import IconCard from '@/components/containers/IconCard.vue'
import Timer from '@/assets/svg/Timer.vue'
import People from '@/assets/svg/People.vue'
import Forward from '@/assets/svg/Forward.vue'
import Contact from '@/assets/svg/Contact.vue'
import { chartOptions } from '@/charts'

export default defineComponent({
  name: 'TrainingInformation',
  components: {
    IconCardSmall,
    IconCard,
    Timer,
    People,
    Forward,
    Contact
  },
  props: {
    trainingInformant: {
      type: TrainingInformant,
      default: undefined
    },
    hasValidationData: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    chartOptions () {
      return chartOptions
    },
    isDecentralizedTrainingScheme (): boolean {
      return this.trainingInformant.isTaskTrainingSchemeDecentralized()
    },
    isFederatedTrainingScheme (): boolean {
      return this.trainingInformant.isTaskTrainingSchemeFederated()
    },
    isDistributedTrainingScheme (): boolean {
      return this.isFederatedTrainingScheme || this.isDecentralizedTrainingScheme
    },
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
      return this.trainingInformant.trainingAccuracy()
    },
    currentValidationAccuracy () {
      return this.trainingInformant.validationAccuracy()
    },
    trainingAccuracyData () {
      return [
        {
          data: this.trainingInformant.trainingAccuracyData().toArray()
        }
      ]
    },
    validationAccuracyData () {
      return [
        {
          data: this.trainingInformant.validationAccuracyData().toArray()
        }
      ]
    }
  }
})
</script>
