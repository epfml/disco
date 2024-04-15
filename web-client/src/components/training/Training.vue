<template>
  <div v-if="task !== undefined && datasetBuilder !== undefined">
    <Description v-show="trainingStore.step === 1" :task="task" />
    <Data
      v-show="trainingStore.step === 2"
      :task="task"
      :dataset-builder="datasetBuilder"
      :is-only-prediction="false"
    />
    <Trainer
      v-show="trainingStore.step === 3"
      :task="task"
      :dataset-builder="datasetBuilder"
    />
    <Finished v-show="trainingStore.step === 4" :task="task" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";

import type { TaskID } from "@epfml/discojs-core";
import { data } from "@epfml/discojs-core";
import {
  WebImageLoader,
  WebTabularLoader,
  WebTextLoader,
} from "@epfml/discojs";

import { useTrainingStore } from "@/store/training";
import { useTasksStore } from "@/store/tasks";
import Data from "@/components/data/Data.vue";

import Description from "./Description.vue";
import Trainer from "./Trainer.vue";
import Finished from "./Finished.vue";

const props = defineProps<{ id: TaskID }>();

const router = useRouter();
const trainingStore = useTrainingStore();
const tasksStore = useTasksStore();

const task = computed(() => {
  const task = tasksStore.tasks.get(props.id);
  if (task === undefined) {
    router.replace({ name: "not-found" });
    return;
  }
  return task;
});

const datasetBuilder = computed(() => {
  if (task.value === undefined) return;

  let dataLoader: data.DataLoader<File>;
  switch (task.value.trainingInformation.dataType) {
    case "tabular":
      dataLoader = new WebTabularLoader(task.value);
      break;
    case "image":
      dataLoader = new WebImageLoader(task.value);
      break;
    case "text":
      dataLoader = new WebTextLoader(task.value);
      break;
    default:
      throw new Error("not implemented");
  }
  return new data.DatasetBuilder(dataLoader, task.value);
});

onMounted(() => {
  trainingStore.setTask(props.id);
  trainingStore.setStep(1);
});
</script>
