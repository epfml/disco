<template>
  <!-- Show loading indicator while tasks are being fetched -->
  <div
    v-if="isLoading"
    class="my-10 flex flex-col justify-center items-center w-full"
  >
    <VueSpinner size="50" color="#6096BA" />
    <div class="mt-10 flex flex-col justify-center items-center">
      <p class="text-disco-blue">Loading the <DISCOllaborative /></p>
      <p class="text-disco-blue text-xs">This can take a few seconds</p>
    </div>
  </div>

  <!-- Show task content once loaded -->
  <div v-else-if="task !== undefined">
    <TrainingDescription v-show="trainingStore.step === 1" :task />

    <div
      v-show="trainingStore.step === 2"
      class="flex flex-col space-y-4 md:space-y-8"
    >
      <LabeledDatasetInput v-model="dataset" :task>
        <template #header>
          <DataDescription :task class="tuto-data-desc" />
        </template>
      </LabeledDatasetInput>
    </div>

    <TrainerDashboard
      v-show="trainingStore.step === 3"
      :task
      :dataset="unnamedDataset"
      @model="(m) => (trainedModel = m)"
    />

    <TrainingFinished
      v-show="trainingStore.step === 4"
      :task
      :model="trainedModel"
    />
  </div>
  <TrainingButtons />
</template>

<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, toRaw, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { VueSpinner } from "vue3-spinners";

import type {
  Dataset,
  DataFormat,
  DataType,
  Model,
  Task,
  Network,
} from "@epfml/discojs";

import type { LabeledDataset } from "@/components/dataset_input/types.js";
import DataDescription from "@/components/dataset_input/DataDescription.vue";
import LabeledDatasetInput from "@/components/dataset_input/LabeledDatasetInput.vue";
import DISCOllaborative from "@/components/simple/DISCOllaborative.vue";
import TrainingButtons from "@/components/progress_bars/TrainingButtons.vue";
import TrainingDescription from "@/components/training/TrainingDescription.vue";
import TrainingFinished from "@/components/training/TrainingFinished.vue";
import TrainerDashboard from "@/components/training/TrainerDashboard.vue";

import { useTasksStore, useTrainingStore } from "@/store";

const router = useRouter();
const route = useRoute();
const trainingStore = useTrainingStore();
const { tasks } = storeToRefs(useTasksStore());

// task ID given by the route
const props = defineProps<{ id: Task.ID }>();

function setupTrainingStore() {
  trainingStore.setTask(route.params.id as string); // more reliable than props.id
  trainingStore.setStep(1);
}

// Check if tasks are still loading
const isLoading = computed<boolean>(() => {
  return typeof tasks.value === "string";
});

// Init the task once the taskStore has been loaded successfully
// If it is not available we redirect to not-found
const task = computed<Task<DataType, Network> | undefined>(() => {
  if (typeof tasks.value === "string") {
    // Tasks are still loading, return undefined to show loading indicator
    return undefined;
  }

  const foundTask = tasks.value.get(props.id);

  // Redirect to not-found if tasks have loaded but this specific task doesn't exist
  if (foundTask === undefined) {
    void router.replace({ name: "not-found" });
  }

  return foundTask;
});

// Addresses the case when users enter a url manually
// Force the training store to synch with the task specified in the url
// Watching route.fullPath triggers onMount (while route.name would not)
watch(
  () => route.fullPath,
  () => {
    if (route.params.id === undefined) return; // don't do anything if not on a task page
    if (trainingStore.step !== 0 && route.params.id === props.id) return; // check that params are consistent
    setupTrainingStore(); // if inconsistent, force sync the training store
  },
);

onMounted(setupTrainingStore);

const dataset = ref<LabeledDataset[DataType]>();
const unnamedDataset = computed<Dataset<DataFormat.Raw[DataType]> | undefined>(
  () => {
    if (task.value === undefined || dataset.value === undefined)
      return undefined;

    switch (task.value.dataType) {
      case "image":
        return (toRaw(dataset.value) as LabeledDataset["image"]).map(
          ({ image, label }) => [image, label],
        ) as Dataset<DataFormat.Raw["image"]>;
      case "tabular":
      case "text":
        return dataset.value as Dataset<DataFormat.Raw["tabular" | "text"]>;
      default: {
        const _: never = task.value;
        throw new Error("should never happen");
      }
    }
  },
);
const trainedModel = ref<Model<DataType>>();
</script>
