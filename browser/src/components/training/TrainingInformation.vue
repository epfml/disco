<template>
  <div>
    <div
      class="grid gap-8"
      :class="hasValidationData ? 'grid-cols-2' : 'grid-cols-1'"
    >
      <!-- Validation Accuracy users chart -->
      <div
        v-if="hasValidationData"
        class="bg-white rounded-md"
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
        <div class="m-4">
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
      <div class="bg-white rounded-md">
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
        <div class="m-4">
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

    <!-- Training logs -->
    <IconCard>
      <template #title>
        Training Logs
      </template>
      <template #icon>
        <Contact />
      </template>
      <template #content>
        <div id="mapHeader">
          <ul class="grid grid-cols-1">
            <li
              v-for="(message, index) in trainingInformant.getMessages()"
              :key="index"
              class="border-slate-400"
            >
              <span
                style="white-space: pre-line"
                class="text-sm text-slate-500"
              >{{ message }}</span>
            </li>
          </ul>
        </div>
      </template>
    </IconCard>

    <!-- Fancy training statistics -->
    <div class="flex flex-wrap justify-center gap-8">
      <IconCardSmall class="w-72 shrink-0">
        <template #header>
          {{ currentRoundText }}
        </template>
        <template #text>
          {{ trainingInformant.round() }}
        </template>
        <template #icon>
          <Timer />
        </template>
      </IconCardSmall>
      <IconCardSmall class="w-72 shrink-0">
        <template #header>
          Current # of participants
        </template>
        <template #text>
          {{ trainingInformant.participants() }}
        </template>
        <template #icon>
          <People />
        </template>
      </IconCardSmall>
      <IconCardSmall class="w-72 shrink-0">
        <template #header>
          Average # of participants
        </template>
        <template #text>
          {{ trainingInformant.averageParticipants() }}
        </template>
        <template #icon>
          <People />
        </template>
      </IconCardSmall>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { TrainingInformant } from 'discojs'

import { chartOptions } from '@/charts'
import IconCardSmall from '@/components/containers/IconCardSmall.vue'
import IconCard from '@/components/containers/IconCard.vue'
import Timer from '@/assets/svg/Timer.vue'
import People from '@/assets/svg/People.vue'
import Contact from '@/assets/svg/Contact.vue'

export default defineComponent({
  name: 'TrainingInformation',
  components: {
    IconCardSmall,
    IconCard,
    Timer,
    People,
    Contact
  },
  props: {
    trainingInformant: {
      validator: TrainingInformant.isTrainingInformant,
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
    displayHeatmap (): boolean {
      return this.trainingInformant.displayHeatmap
    },
    currentRoundText (): string {
      return this.trainingInformant.isDecentralized() || this.trainingInformant.isFederated()
        ? 'Current Round'
        : 'Current Epoch'
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
    currentTrainingAccuracy (): number {
      return this.trainingInformant.trainingAccuracy()
    },
    currentValidationAccuracy (): number {
      return this.trainingInformant.validationAccuracy()
    },
    trainingAccuracyData (): [{ data: number[] }] {
      return [
        {
          data: this.trainingInformant.trainingAccuracyData().toArray()
        }
      ]
    },
    validationAccuracyData (): [{ data: number[] }] {
      return [
        {
          data: this.trainingInformant.validationAccuracyData().toArray()
        }
      ]
    }
  }
})
</script>
