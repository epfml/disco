<template>
  <div class="space-y-4 md:space-y-8">
    <!-- Fancy training statistics -->
    <div class="flex flex-wrap justify-center gap-4 md:gap-8">
      <IconCardSmall class="w-72 shrink-0">
        <template #header>
          current round
        </template>
        <template #text>
          {{ (logs.last()?.round ?? 0) + 1 }}
        </template>
        <template #icon>
          <Timer />
        </template>
      </IconCardSmall>
      <IconCardSmall class="w-72 shrink-0">
        <template #header>
          current # of participants
        </template>
        <template #text>
          {{ participants.current }}
        </template>
        <template #icon>
          <People />
        </template>
      </IconCardSmall>
      <IconCardSmall class="w-72 shrink-0">
        <template #header>
          average # of participants
        </template>
        <template #text>
          {{ participants.average }}
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
            {{ percent(latestEpoch?.training.accuracy ?? 0) }}
          </span>
          <span class="text-sm font-medium text-slate-500">
            {{
              $t('training.trainingInformationFrame.accuracyCharts.trainingAccuracyText')
            }}
          </span>
          <!-- Chart -->
          <ApexChart
            width="100%"
            height="200"
            type="area"
            :options="options"
            :series="[{ data: accuracySeries.training }]"
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
            {{ percent(latestEpoch?.validation.accuracy ?? 0) }}
          </span>
          <span class="text-sm font-medium text-slate-500">
            {{
              $t('training.trainingInformationFrame.accuracyCharts.validationAccuracyText')
            }}
          </span>
          <!-- Chart -->
          <ApexChart
            width="100%"
            height="200"
            type="area"
            :options="options"
            :series="[{ data: accuracySeries.validation }]"
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
              v-for="(message, index) in props.messages"
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
import { List } from 'immutable'
import { computed, ref } from 'vue'
// @ts-expect-error waiting for vue3-apexcharts#98
import ApexChart from "vue3-apexcharts";

import type { RoundLogs } from '@epfml/discojs-core'

import { chartOptions } from '@/charts'
import IconCardSmall from '@/components/containers/IconCardSmall.vue'
import IconCard from '@/components/containers/IconCard.vue'
import Timer from '@/assets/svg/Timer.vue'
import People from '@/assets/svg/People.vue'
import Contact from '@/assets/svg/Contact.vue'

const props = defineProps<{
  logs: List<RoundLogs>
  hasValidationData: boolean // TODO infer from logs
  messages: List<string> // TODO why do we want messages?
}>()

const options = chartOptions

const participants = ref({ current: 1, average: 1 }) // TODO collect real data

const latestEpoch = computed(() => props.logs.last()?.epoches.last())

const accuracySeries = computed(() => props.logs
  .flatMap((round) =>
    round.epoches.map((epoch) => { return {
      training: epoch.training.accuracy * 100,
      validation: epoch.validation.accuracy * 100,
    }})
  )
  .takeLast(10)
  .reduce(({ training, validation }, cur) => { return {
    training: training.concat([cur.training]),
    validation: validation.concat([cur.validation]),
  }}, {
    training: [] as number[],
    validation: [] as number[],
  })
)

function percent(n: number): string {
  return (n * 100).toFixed(2)
}
</script>
