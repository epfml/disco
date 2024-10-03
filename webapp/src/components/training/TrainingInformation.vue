<template>
  <div class="space-y-4 md:space-y-8">
    <!-- Fancy training statistics -->
    <div class="flex flex-wrap justify-center 2xl:justify-between gap-4 md:gap-8">
      <!-- Hide the communication rounds when training alone -->
      <IconCardSmall
      v-if="!isTrainingAlone"
      v-tippy="{
        content: 'The number of times the model has been updated with models shared by collaborators. No data is shared.',
        placement: 'top'
      }"
      header="Collaborative model sharing"
      :text="`${rounds.size}`"
      class="w-72 shrink-0 hover:cursor-pointer"
      >
        <ModelExchangeIcon custom-class="text-gray-300 w-9 h-9" />
      </IconCardSmall>
      <IconCardSmall
        v-tippy="{
          content: 'The number of complete passes through the training dataset.',
          placement: 'top'
        }"
        header="epochs"
        :text="`${allEpochs.size} / ${numberOfEpochs}`"
        class="w-72 shrink-0 hover:cursor-pointer"
      >
        <Timer />
      </IconCardSmall>
      <IconCardSmall
        v-tippy="{
          content: 'The number of times the model has been updated during the current epoch.',
          placement: 'top'
        }"
        header="current batch"
        :text="`${batchesCount}`"
        class="w-72 shrink-0 hover:cursor-pointer"
      >
        <ModelUpdateIcon />
      </IconCardSmall>

      <IconCardSmall
        v-tippy="{
          content: 'Number of collaborators concurrently training a model and sharing model updates.',
          placement: 'top'
        }"
        header="number of participants"
        :text="`${participants.current}`"
        class="w-72 shrink-0 hover:cursor-pointer"
      >
        <PeopleIcon />
      </IconCardSmall>
    </div>

    <!-- Training and validation loss charts -->
    <div
      class="flex flex-col md:grid gap-4 md:gap-8"
      :class="hasValidationData ? 'md:grid-cols-2' : ''"
    >
      <!-- Training loss users chart -->
      <IconCard>
        <template #title> Training Loss of the Model </template>

        <span class="text-2xl font-medium text-slate-500 dark:text-slate-300">
          {{ (lastEpoch?.training.loss ?? 0).toFixed(2) }}
        </span>
        <span class="text-sm font-medium text-slate-500 dark:text-slate-400">
          training loss
        </span>

        <ApexChart
          width="100%"
          height="200"
          type="area"
          :options="lossChartsOptions"
          :series="[{ name: 'Training loss', data: lossSeries.training }]"
        />
      </IconCard>

      <!-- Validation Loss users chart -->
      <IconCard v-if="hasValidationData">
        <template #title> Validation Loss of the Model </template>

        <span class="text-2xl font-medium text-slate-500 dark:text-slate-300">
          {{ (lastEpoch?.validation?.loss ?? 0).toFixed(2) }}
        </span>
        <span class="text-sm font-medium text-slate-500 dark:text-slate-400">
          validation loss
        </span>

        <ApexChart
          width="100%"
          height="200"
          type="area"
          :options="lossChartsOptions"
          :series="[{ name: 'Validation loss', data: lossSeries.validation }]"
        />
      </IconCard>
    </div>

    <!-- Training and validation accuracy charts -->
    <div
      class="flex flex-col md:grid gap-4 md:gap-8"
      :class="hasValidationData ? 'md:grid-cols-2' : ''"
    >
      <!-- Training Accuracy users chart -->
      <IconCard>
        <template #title> Training Accuracy of the Model </template>

        <span class="text-2xl font-medium text-slate-500 dark:text-slate-300">
          {{ percent(lastEpoch?.training.accuracy ?? 0) }}
        </span>
        <span class="text-sm font-medium text-slate-500 dark:text-slate-400">
          % of training accuracy
        </span>

        <ApexChart
          width="100%"
          height="200"
          type="area"
          :options="accuracyChartsOptions"
          :series="[
            { name: 'Training accuracy', data: accuracySeries.training },
          ]"
        />
      </IconCard>

      <!-- Validation Accuracy users chart -->
      <IconCard v-if="hasValidationData">
        <template #title> Validation Accuracy of the Model </template>

        <span class="text-2xl font-medium text-slate-500 dark:text-slate-300">
          {{ percent(lastEpoch?.validation?.accuracy ?? 0) }}
        </span>
        <span class="text-sm font-medium text-slate-500 dark:text-slate-400">
          % of validation accuracy
        </span>

        <ApexChart
          width="100%"
          height="200"
          type="area"
          :options="accuracyChartsOptions"
          :series="[
            { name: 'Validation accuracy', data: accuracySeries.validation },
          ]"
        />
      </IconCard>
    </div>

    <IconCard>
      <template #title> Training Logs </template>
      <template #icon> <Contact /> </template>

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
              class="text-sm text-slate-500 dark:text-slate-400"
            >
              {{ message }}
            </span>
          </li>
        </ul>
      </div>
    </IconCard>
  </div>
</template>

<script setup lang="ts">
import { List } from "immutable";
import { computed } from "vue";
import ApexChart from "vue3-apexcharts";

import type { BatchLogs, EpochLogs, RoundLogs } from "@epfml/discojs";

import IconCardSmall from "@/components/containers/IconCardSmall.vue";
import IconCard from "@/components/containers/IconCard.vue";
import Timer from "@/assets/svg/Timer.vue";
import ModelExchangeIcon from "@/assets/svg/ModelExchangeIcon.vue";
import ModelUpdateIcon from "@/assets/svg/ModelUpdateIcon.vue";
import PeopleIcon from "@/assets/svg/PeopleIcon.vue";
import Contact from "@/assets/svg/Contact.vue";

const props = defineProps<{
  rounds: List<RoundLogs>;
  epochsOfRound: List<EpochLogs>;
  numberOfEpochs: number;
  batchesOfEpoch: List<BatchLogs>;
  hasValidationData: boolean; // TODO infer from logs
  messages: List<string>; // TODO why do we want messages?
  isTrainingAlone: boolean // Should be set to True if using the training scheme 'local'
  isTraining: boolean // Is the user currently training a model
}>();

const participants = computed(() => ({
  // if the number of participants is not defined, default to
  // 0 if not currently training
  // or 1 if training or before the 1st communication round)
  current: props.rounds.last()?.participants ?? (props.isTraining ? 1 : 0),
  average:
    props.rounds.size > 0
      ? props.rounds.reduce((acc, round) => acc + round.participants, 0) /
      props.rounds.size
      : 0,
}));

const batchesCount = computed(() => props.batchesOfEpoch.size);

const allEpochs = computed<List<EpochLogs>>((oldValue) => {
  const ret = props.rounds
    .flatMap((round) => round.epochs)
    .concat(props.epochsOfRound);

  // avoid recomputing dependencies such as when finishing round
  if (oldValue !== undefined && ret.equals(oldValue)) return oldValue;

  return ret;
});
const lastEpoch = computed(() => allEpochs.value.last());

const accuracySeries = computed(() =>
  allEpochs.value
    .map((epoch) => ({
      training: epoch.training.accuracy * 100,
      validation: (epoch.validation?.accuracy ?? 0) * 100,
    }))
    .reduce(
      ({ training, validation }, cur) => ({
        training: training.concat([cur.training]),
        validation: validation.concat([cur.validation]),
      }),
      {
        training: [] as number[],
        validation: [] as number[],
      },
    ),
);
const lossSeries = computed(() =>
  allEpochs.value
    .map((epoch) => ({
      training: epoch.training.loss,
      validation: epoch.validation?.loss ?? 0,
    }))
    .reduce(
      ({ training, validation }, cur) => ({
        training: training.concat([cur.training]),
        validation: validation.concat([cur.validation]),
      }),
      {
        training: [] as number[],
        validation: [] as number[],
      },
    ),
);
const darkMode = localStorage.getItem("theme") === "dark";
const commonChartsOptions = {
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  dataLabels: { enabled: false },
  colors: [darkMode ? "#cbd5e1" : "#6096BA"],
  fill: {
    colors: [darkMode ? "#1A3A4F" : "#E2E8F0"],
    type: "solid",
    opacity: 0.6,
  },
  stroke: { curve: "smooth" },
  grid: { show: false },
  xaxis: {
    labels: {
      show: true,
      style: {
        colors: darkMode ? "#ffffff" : "#000000",
      },
    },
    axisBorder: {
      show: true,
      colors: darkMode ? "#ffffff" : "#000000",
    },
    axisTicks: {
      show: true,
      color: darkMode ? "#ffffff" : "#000000",
    },
  },
  yaxis: {
    labels: {
      show: true,
      style: {
        colors: darkMode ? "#ffffff" : "#000000",
      },
    },
    axisBorder: {
      show: true,
      color: darkMode ? "#ffffff" : "#000000",
    },
    axisTicks: {
      show: true,
      color: darkMode ? "#ffffff" : "#000000",
    },
  },
  legend: {
    show: true,
    labels: {
      colors: darkMode ? "#ffffff" : "#000000",
    },
  },
  tooltip: {
    theme: darkMode ? 'dark' : 'light',
    style: {
      fontSize: '12px',
      fontFamily: undefined,
      colors: darkMode ? '#ffffff' : '#000000',
    },
  }
};

const accuracyChartsOptions = {
  ...commonChartsOptions,
  yaxis: {
    ...commonChartsOptions.yaxis,
    max: 100,
    min: 0,
    labels: { 
      ...commonChartsOptions.yaxis.labels,
      formatter: (value: number) => value.toFixed(0) 
    },
  },
};

const lossChartsOptions = computed(() => {
  const maxVal = Math.max(
    lossSeries.value.training.reduce((max, e) => Math.max(max, e), 0),
    lossSeries.value.validation.reduce((max, e) => Math.max(max, e), 0),
  );
  // if Math.max returns -inf or 0, set the max to 10 arbitrarily
  const yAxisMax = maxVal > 0 ? maxVal : 10;

  return {
    ...commonChartsOptions,
    yaxis: {
      ...commonChartsOptions.yaxis,
      max: yAxisMax,
      min: 0,
      labels: { 
        ...commonChartsOptions.yaxis.labels,
        formatter: (n: number) => n.toFixed(2) 
      },
    },
  };
});

function percent(n: number): string {
  return (n * 100).toFixed(2);
}
</script>
