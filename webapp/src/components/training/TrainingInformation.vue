<template>
  <div class="space-y-4 md:space-y-8">
    <!-- Fancy training statistics -->
    <div class="flex flex-wrap justify-center 2xl:justify-between cards-gap">
      <!-- Hide the communication rounds when training alone -->
      <IconCardSmall
        v-if="!isTrainingAlone"
        v-tippy="{
          content:
            'The number of times the model has been updated with models shared by collaborators. No data is shared.',
          placement: 'top',
        }"
        header="Collaborative model sharing"
        :text="`${rounds.size}`"
        class="w-72 shrink-0 hover:cursor-pointer"
      >
        <ModelExchangeIcon custom-class="text-gray-300 w-9 h-9" />
      </IconCardSmall>
      <IconCardSmall
        v-tippy="{
          content:
            'The number of complete passes through the training dataset.',
          placement: 'top',
        }"
        header="epochs"
        :text="`${allEpochs.size} / ${numberOfEpochs}`"
        class="w-72 shrink-0 hover:cursor-pointer"
      >
        <TimerIcon />
      </IconCardSmall>
      <IconCardSmall
        v-tippy="{
          content:
            'The number of times the model has been updated during the current epoch.',
          placement: 'top',
        }"
        header="current batch"
        :text="`${batchesCount}`"
        class="w-72 shrink-0 hover:cursor-pointer"
      >
        <ModelUpdateIcon />
      </IconCardSmall>

      <IconCardSmall
        v-tippy="{
          content:
            'Number of collaborators concurrently training a model and sharing model updates.',
          placement: 'top',
        }"
        header="number of participants"
        :text="`${nbParticipants}`"
        class="w-72 shrink-0 hover:cursor-pointer"
      >
        <PeopleIcon />
      </IconCardSmall>
    </div>

    <!-- Training and validation loss charts -->
    <DropdownCard :initially-open @click="toggleAdvancedInfo">
      <template #title> Advanced information </template>
      <div class="grid grid-cols-1 md:grid-cols-2 cards-gap">
        <!-- Training loss users chart -->
        <IconCard>
          <template #title> Training Loss of the Model </template>

          <span class="text-2xl">
            {{ (lastEpoch?.training.loss ?? 0).toFixed(2) }}
          </span>
          <span class="text-sm"> training loss </span>

          <Line
            :options="lossChartsOptions"
            :data="{
              labels: chartsLabels,
              datasets: [{ label: 'Training loss', data: lossSeries.training }],
            }"
          />
        </IconCard>

        <!-- Training Accuracy users chart -->
        <IconCard>
          <template #title> Training Accuracy of the Model </template>

          <span class="text-2xl">
            {{ percent(lastEpoch?.training.accuracy ?? 0) }}
          </span>
          <span class="text-sm"> % of training accuracy </span>

          <Line
            :options="accuracyChartsOptions"
            :data="{
              labels: chartsLabels,
              datasets: [
                { label: 'Training accuracy', data: accuracySeries.training },
              ],
            }"
          />
        </IconCard>
      </div>

      <!-- Training and validation accuracy charts -->
      <div
        v-if="hasValidationData"
        class="grid grid-cols-1 md:grid-cols-2 cards-gap"
      >
        <!-- Validation Loss users chart -->
        <IconCard>
          <template #title> Validation Loss of the Model </template>

          <span class="text-2xl">
            {{ (lastEpoch?.validation?.loss ?? 0).toFixed(2) }}
          </span>
          <span class="text-sm"> validation loss </span>

          <Line
            :options="lossChartsOptions"
            :data="{
              labels: chartsLabels,
              datasets: [
                { label: 'Validation loss', data: lossSeries.validation },
              ],
            }"
          />
        </IconCard>
        <!-- Validation Accuracy users chart -->
        <IconCard>
          <template #title> Validation Accuracy of the Model </template>

          <span class="text-2xl">
            {{ percent(lastEpoch?.validation?.accuracy ?? 0) }}
          </span>
          <span class="text-sm"> % of validation accuracy </span>

          <Line
            :options="accuracyChartsOptions"
            :data="{
              labels: chartsLabels,
              datasets: [
                {
                  label: 'Validation accuracy',
                  data: accuracySeries.validation,
                },
              ],
            }"
          />
        </IconCard>
      </div>
    </DropdownCard>
  </div>
</template>

<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
  type TooltipPositionerFunction,
} from "chart.js";
import type { List} from "immutable";
import { Range } from "immutable";
import { computed, ref } from "vue";
import { Line } from "vue-chartjs";

import type { BatchLogs, EpochLogs, RoundLogs } from "@epfml/discojs";

import IconCardSmall from "@/components/containers/IconCardSmall.vue";
import IconCard from "@/components/containers/IconCard.vue";
import TimerIcon from "@/assets/svg/TimerIcon.vue";
import ModelExchangeIcon from "@/assets/svg/ModelExchangeIcon.vue";
import ModelUpdateIcon from "@/assets/svg/ModelUpdateIcon.vue";
import PeopleIcon from "@/assets/svg/PeopleIcon.vue";
import DropdownCard from "../containers/DropdownCard.vue";
import { useThemeStore } from "@/store";

ChartJS.register(
  CategoryScale,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

const theme = useThemeStore();

const initiallyOpen = ref(
  localStorage.getItem("initiallyOpen") === "true" ? true : false,
);

const props = defineProps<{
  rounds: List<RoundLogs>;
  epochsOfRound: List<EpochLogs>;
  numberOfEpochs: number;
  batchesOfEpoch: List<BatchLogs>;
  hasValidationData: boolean; // TODO infer from logs
  isTrainingAlone: boolean; // Should be set to True if using the training scheme 'local'
  isTraining: boolean; // Is the user currently training a model
  nbParticipants: number; // Number of participants in the training
}>();

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

const chartsLabels = computed<string[]>(() =>
  Range(1, allEpochs.value.size + 1)
    .map((e) => `${e}`)
    .toArray(),
);
const textColor = theme.selectByTheme("rgb(100, 116, 139)", "rgb(226 232 240)");

Tooltip.positioners.left = function (items, event) {
  const nearest = Tooltip.positioners.nearest.bind(this)(items, event);
  if (nearest === false) return false;

  return {
    x: this.chart.chartArea.left,
    y: nearest.y,
  };
};
declare module "chart.js" {
  interface TooltipPositionerMap {
    left: TooltipPositionerFunction<"line">;
  }
}

const commonChartsOptions = computed<ChartOptions<"line">>(() => ({
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      displayColors: false,
      position: "left",
    },
  },
  elements: {
    line: {
      fill: "start",
      tension: 0.4,
      borderColor: theme.selectByTheme("#6096BA", "#cbd5e1").value,
      backgroundColor: theme.selectByTheme("#E2E8F0", "#1A3A4F").value,
    },
    point: {
      pointStyle: false,
    },
  },
  interaction: {
    intersect: false,
    mode: "index",
  },
}));

const accuracyChartsOptions = computed<ChartOptions<"line">>(() => ({
  ...commonChartsOptions.value,
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: textColor.value },
    },
    y: {
      max: 100,
      min: 0,
      grid: { display: false },
      ticks: { color: textColor.value },
    },
  },
}));

const lossChartsOptions = computed<ChartOptions<"line">>(() => {
  const maxVal = Math.max(
    lossSeries.value.training.reduce((max, e) => Math.max(max, e), 0),
    lossSeries.value.validation.reduce((max, e) => Math.max(max, e), 0),
  );
  // if Math.max returns -inf or 0, set the max to 10 arbitrarily
  const yAxisMax = maxVal > 0 ? maxVal : 10;

  return {
    ...commonChartsOptions.value,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor.value },
      },
      y: {
        max: yAxisMax,
        min: 0,
        grid: { display: false },
        ticks: { color: textColor.value },
      },
    },
  };
});

function percent(n: number): string {
  return (n * 100).toFixed(2);
}

// Function to toggle the advanced information
function toggleAdvancedInfo(): void {
  const newOpen = initiallyOpen.value === false ? true : false;
  localStorage.setItem("initiallyOpen", newOpen + "");
  initiallyOpen.value = newOpen;
}
</script>
