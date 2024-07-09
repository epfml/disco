<template>
  <div class="space-y-4 md:space-y-8">
    <!-- Fancy training statistics -->
    <div class="flex flex-wrap justify-center 2xl:justify-between gap-4 md:gap-8">
      <IconCardSmall
        data-placement="top"
        data-title="The number of times the model has been updated with the collaborators' models. No data is shared."
        header="Collaborative model sharing"
        :text="`${modelSharingRounds}`"
        class="w-72 shrink-0 tippy-tooltip hover:cursor-pointer"
      >
        <ModelExchangeIcon custom-class="text-gray-300 w-9 h-9" />
      </IconCardSmall>
      <IconCardSmall
        data-placement="top"
        data-title="The number of complete passes through the training dataset"
        header="epochs"
        :text="`${allEpochs.size} / ${numberOfEpochs}`"
        class="w-72 shrink-0 tippy-tooltip hover:cursor-pointer"
      >
        <Timer />
      </IconCardSmall>
      <IconCardSmall
        data-placement="top"
        data-title="The number of times the model has been updated during the current epoch"
        header="current batch"
        :text="`${batchesCount}`"
        class="w-72 shrink-0 tippy-tooltip hover:cursor-pointer"
      >
        <ModelUpdateIcon />
      </IconCardSmall>

      <IconCardSmall
        data-placement="top"
        data-title="Collaborators concurrently training a model and sharing model updates"
        header="number of participants"
        :text="`${participants.current}`"
        class="w-72 shrink-0  tippy-tooltip hover:cursor-pointer"
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
        <!-- Card header -->
        <template #title> Training Loss of the Model </template>
        <template #content>
          <span class="text-2xl font-medium text-slate-500">
            {{ (lastEpoch?.training.loss ?? 0).toFixed(2) }}
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
      <IconCard v-if="hasValidationData">
        <!-- Card header -->
        <template #title> Validation Loss of the Model </template>
        <template #content>
          <span class="text-2xl font-medium text-slate-500">
            {{ (lastEpoch?.validation?.loss ?? 0).toFixed(2) }}
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
        <template #title> Training Accuracy of the Model </template>
        <template #content>
          <span class="text-2xl font-medium text-slate-500">
            {{ percent(lastEpoch?.training.accuracy ?? 0) }}
          </span>
          <span class="text-sm font-medium text-slate-500">
            % of training accuracy
          </span>
          <!-- Chart -->
          <ApexChart
            width="100%"
            height="200"
            type="area"
            :options="accuracyChartsOptions"
            :series="[
              { name: 'Training accuracy', data: accuracySeries.training },
            ]"
          />
        </template>
      </IconCard>

      <!-- Validation Accuracy users chart -->
      <IconCard v-if="hasValidationData">
        <!-- Card header -->
        <template #title> Validation Accuracy of the Model </template>
        <template #content>
          <span class="text-2xl font-medium text-slate-500">
            {{ percent(lastEpoch?.validation?.accuracy ?? 0) }}
          </span>
          <span class="text-sm font-medium text-slate-500">
            % of validation accuracy
          </span>
          <!-- Chart -->
          <ApexChart
            width="100%"
            height="200"
            type="area"
            :options="accuracyChartsOptions"
            :series="[
              { name: 'Validation accuracy', data: accuracySeries.validation },
            ]"
          />
        </template>
      </IconCard>
    </div>

    <!-- Training logs -->
    <IconCard>
      <template #title> Training Logs </template>
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
              >
                {{ message }}
              </span>
            </li>
          </ul>
        </div>
      </template>
    </IconCard>
  </div>
</template>

<script setup lang="ts">
import { List } from "immutable";
import { computed, onMounted } from "vue";
import ApexChart from "vue3-apexcharts";
import tippy from 'tippy.js'
import type { Instance, Props, Placement } from 'tippy.js'

import type { BatchLogs, EpochLogs, RoundLogs } from "@epfml/discojs";

import IconCardSmall from "@/components/containers/IconCardSmall.vue";
import IconCard from "@/components/containers/IconCard.vue";
import Timer from "@/assets/svg/Timer.vue";
import ModelExchangeIcon from "@/assets/svg/ModelExchangeIcon.vue";
import ModelUpdateIcon from "@/assets/svg/ModelUpdateIcon.vue";
import PeopleIcon from "@/assets/svg/PeopleIcon.vue";
import Contact from "@/assets/svg/Contact.vue";

onMounted(() => {
  tippy('.tippy-tooltip', {
    theme: 'custom-dark',
    delay: 0,
    duration: 0,
    content: (reference: Element) => reference.getAttribute('data-title') as string,
    onMount: (instance: Instance<Props>) => {
      instance.popperInstance?.setOptions({
        placement: instance.reference.getAttribute('data-placement') as Placement
      })
    }
  })
})

const props = defineProps<{
  rounds: List<RoundLogs & { participants: number }>;
  epochsOfRound: List<EpochLogs>;
  numberOfEpochs: number;
  batchesOfEpoch: List<BatchLogs>;
  hasValidationData: boolean; // TODO infer from logs
  messages: List<string>; // TODO why do we want messages?
}>();

const participants = computed(() => {
  const roundParticipants = props.rounds.last()?.participants
  let nbOfParticipants;
  if (roundParticipants !== undefined) {
    nbOfParticipants = roundParticipants
  } else {
    // 1 if started training (potentially in local) otherwise 0
    nbOfParticipants = props.messages.size > 0 ? 1 : 0
  }
  
  
  return {
    current: nbOfParticipants,
    average:
      props.rounds.size > 0
        ? props.rounds.reduce((acc, round) => acc + round.participants, 0) /
        props.rounds.size
        : 0,
  }
});

const batchesCount = computed(() => props.batchesOfEpoch.size);

// Force the collaborative model sharing to 0 if training alone
// otherwise show the current number of rounds
const modelSharingRounds = computed(() => {
  if (participants.value.average <= 1) {
    return 0
  } else {
    return props.rounds.size
  }
});

const allEpochs = computed(() =>
  props.rounds.flatMap((round) => round.epochs).concat(props.epochsOfRound),
);
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

const commonChartsOptions = {
  chart: {
    animations: {
      enabled: true,
      easing: "linear",
      dynamicAnimation: { speed: 1000 },
    },
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  dataLabels: { enabled: false },
  colors: ["#6096BA"],
  fill: {
    colors: ["#E2E8F0"],
    type: "solid",
    opacity: 0.6,
  },
  stroke: { curve: "smooth" },
  markers: { size: 0.5 },
  grid: {
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: false } },
  },
  xaxis: { labels: { show: false } },
  legend: { show: false },
  tooltip: { enabled: true },
};

const accuracyChartsOptions = {
  ...commonChartsOptions,
  yaxis: {
    max: 100,
    min: 0,
    labels: {
      show: true,
      formatter: (value: number) => value.toFixed(0),
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
      max: yAxisMax,
      min: 0,
      labels: {
        show: true,
        formatter: (n: number) => n.toFixed(2),
      },
    },
  };
});

function percent(n: number): string {
  return (n * 100).toFixed(2);
}
</script>
