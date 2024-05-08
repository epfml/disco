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

    <!-- Training and validation loss charts -->
    <div
      class="flex flex-col md:grid gap-4 md:gap-8"
      :class="hasValidationData ? 'md:grid-cols-2' : ''"
    >
      <!-- Training Accuracy users chart -->
      <IconCard>
        <!-- Card header -->
        <template #title>
          Training Loss of the Model
        </template>
        <template #content>
          <span class="text-2xl font-medium text-slate-500">
            {{ (latestEpoch?.training.loss ?? 0).toFixed(2) }}
          </span>
          <span class="text-sm font-medium text-slate-500">
            training loss
          </span>
          <!-- Chart -->
          <ApexChart
            width="100%"
            height="200"
            type="area"
            :options="lossChartsOptions"
            :series="[{ name: 'Training loss', data: lossSeries.training }]"
          />
        </template>
      </IconCard>

      <!-- Validation Loss users chart -->
      <IconCard
        v-if="hasValidationData"
      >
        <!-- Card header -->
        <template #title>
          Validation Loss of the Model
        </template>
        <template #content>
          <span class="text-2xl font-medium text-slate-500">
            {{ (latestEpoch?.validation?.loss ?? 0).toFixed(2) }}
          </span>
          <span class="text-sm font-medium text-slate-500">
            validation loss
          </span>
          <!-- Chart -->
          <ApexChart
            width="100%"
            height="200"
            type="area"
            :options="lossChartsOptions"
            :series="[{ name: 'Validation loss', data: lossSeries.validation }]"
          />
        </template>
      </IconCard>
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
          Training Accuracy of the Model
        </template>
        <template #content>
          <span class="text-2xl font-medium text-slate-500">
            {{ percent(latestEpoch?.training.accuracy ?? 0) }}
          </span>
          <span class="text-sm font-medium text-slate-500">
             % of training accuracy
          </span>
          <!-- Chart -->
          <ApexChart
            width="100%"
            height="200"
            type="area"
            :options="options"
            :series="[{ name: 'Training accuracy', data: accuracySeries.training }]"
          />
        </template>
      </IconCard>

      <!-- Validation Accuracy users chart -->
      <IconCard
        v-if="hasValidationData"
      >
        <!-- Card header -->
        <template #title>
          Validation Accuracy of the Model
        </template>
        <template #content>
          <span class="text-2xl font-medium text-slate-500">
            {{ percent(latestEpoch?.validation?.accuracy ?? 0) }}
          </span>
          <span class="text-sm font-medium text-slate-500">
            % of validation accuracy
          </span>
          <!-- Chart -->
          <ApexChart
            width="100%"
            height="200"
            type="area"
            :options="options"
            :series="[{ name: 'Validation accuracy', data: accuracySeries.validation }]"
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
        <!-- Scrollable training logs -->
        <div id="mapHeader" class="max-h-80 overflow-y-auto">
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
import { computed } from 'vue'
// @ts-expect-error waiting for vue3-apexcharts#98
import ApexChart from "vue3-apexcharts";
import { chartOptions } from '@/charts'

import type { RoundLogs } from '@epfml/discojs-core'

import IconCardSmall from '@/components/containers/IconCardSmall.vue'
import IconCard from '@/components/containers/IconCard.vue'
import Timer from '@/assets/svg/Timer.vue'
import People from '@/assets/svg/People.vue'
import Contact from '@/assets/svg/Contact.vue'

const props = defineProps<{
  logs: List<RoundLogs & { participants: number }>
  hasValidationData: boolean // TODO infer from logs
  messages: List<string> // TODO why do we want messages?
}>()

const options = chartOptions

const participants = computed(() => {
  const average = props.logs.size > 0
    ? props.logs.reduce((acc, logs) => acc + logs.participants, 0) / props.logs.size
    : 0
  return {
    current: props.logs.last()?.participants ?? 0,
    average
  }
})

const latestEpoch = computed(() => props.logs.last()?.epochs.last())

const accuracySeries = computed(() => props.logs
  .flatMap((round) =>
    round.epochs.map((epoch) => { return {
      training: (epoch.training.accuracy ?? 0) * 100,
      validation: (epoch.validation?.accuracy ?? 0) * 100,
    }})
  )
  .reduce(({ training, validation }, cur) => { return {
    training: training.concat([cur.training]),
    validation: validation.concat([cur.validation]),
  }}, {
    training: [] as number[],
    validation: [] as number[],
  })
)
const lossSeries = computed(() => props.logs
  .flatMap((round) =>
    round.epochs.map((epoch) => { return {
      training: epoch.training.loss,
      validation: (epoch.validation?.loss ?? 0),
    }})
  )
  .reduce(({ training, validation }, cur) => { return {
    training: training.concat([cur.training]),
    validation: validation.concat([cur.validation]),
  }}, {
    training: [] as number[],
    validation: [] as number[],
  })
)

const yAxisMax = computed(() => {
  let maxVal = Math.max(...lossSeries.value.training, ...lossSeries.value.validation)
  return (maxVal > 0) ? maxVal : 10 // if Math.max returns -inf or 0, set the max to 10 arbitrarily
})

const lossChartsOptions = computed(() => {
  return {
    ...options,
    yaxis: {
      max: () => yAxisMax.value,
      min: 0,
      labels: {
        show: true,
        formatter: function (value: number) {
          return value.toFixed(2);
        }
      }
    }
  }
})

function percent(n: number): string {
  return (n * 100).toFixed(2)
}
</script>
