<template>
  <div class="space-y-4 md:space-y-8">

    <!-- Fancy training statistics -->
    <div class="flex flex-wrap justify-center gap-4 md:gap-8">
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

    <!-- Training and validation accuracy charts -->
    <div
      class="flex flex-col md:grid gap-4 md:gap-8"
      :class="hasValidationData ? 'md:grid-cols-2' : ''"
    >
    <!-- Training Accuracy users chart -->
    <IconCard>
        <!-- Card header -->
        <template #title>
          {{
            $t('training.trainingInformationFrame.accuracyCharts.trainingAccuracyHeader')
          }}
        </template>
        <template #content>
          <span class="text-2xl font-medium text-slate-500">
            {{ currentTrainingAccuracy }}
          </span>
          <span class="text-sm font-medium text-slate-500">
            {{
              $t('training.trainingInformationFrame.accuracyCharts.trainingAccuracyText')
            }}
          </span>
          <!-- Chart -->
          <apexchart
            width="100%"
            height="200"
            type="area"
            :options="options"
            :series="trainingAccuracyData"
          />
        </template>
      </IconCard>

      <!-- Validation Accuracy users chart -->
      <IconCard
        v-if="hasValidationData"
      >
        <!-- Card header -->
        <template #title>
          {{
            $t('training.trainingInformationFrame.accuracyCharts.validationAccuracyHeader')
          }}
        </template>
        <template #content>
          <span class="text-2xl font-medium text-slate-500">
            {{ currentValidationAccuracy }}
          </span>
          <span class="text-sm font-medium text-slate-500">
            {{
              $t('training.trainingInformationFrame.accuracyCharts.validationAccuracyText')
            }}
          </span>
          <!-- Chart -->
          <apexchart
            width="100%"
            height="200"
            type="area"
            :options="options"
            :series="validationAccuracyData"
          />
        </template>
      </IconCard>
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
  </div>
</template>

<script setup lang="ts">
import { defineProps, computed } from 'vue'

import { TrainingInformant } from '@epfml/discojs'

import { chartOptions } from '@/charts'
import IconCardSmall from '@/components/containers/IconCardSmall.vue'
import IconCard from '@/components/containers/IconCard.vue'
import Timer from '@/assets/svg/Timer.vue'
import People from '@/assets/svg/People.vue'
import Contact from '@/assets/svg/Contact.vue'

interface Props {
  trainingInformant?: TrainingInformant
  hasValidationData: boolean
}
const props = defineProps<Props>()
const options = computed(() => chartOptions)
const currentRoundText = computed(() =>
  props.trainingInformant.isDecentralized() || props.trainingInformant.isFederated()
    ? 'Current Round'
    : 'Current Epoch')
const currentTrainingAccuracy = computed(() => props.trainingInformant.trainingAccuracy())
const currentValidationAccuracy = computed(() => props.trainingInformant.validationAccuracy())
const trainingAccuracyData = computed(() => [{
  data: props.trainingInformant.trainingAccuracyData().toArray()
}])
const validationAccuracyData = computed(() => [{
  data: props.trainingInformant.validationAccuracyData().toArray()
}])
</script>
