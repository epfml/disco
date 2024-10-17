<template>
  <div v-if="task !== undefined">
    <Description v-show="trainingStore.step === 1" :task="task" />

    <div
      v-show="trainingStore.step === 2"
      class="flex flex-col space-y-4 md:space-y-8"
    >
      <DataDescription :task="task" />

      <LabeledImageDatasetInput
        v-if="task.trainingInformation.dataType === 'image'"
        v-model="imageDataset"
        :labels="labels"
      />
      <TabularDatasetInput
        v-if="task.trainingInformation.dataType === 'tabular'"
        v-model="tabularDataset"
      />
      <TextDatasetInput
        v-if="task.trainingInformation.dataType === 'text'"
        v-model="textDataset"
        :task="task"
      />
    </div>

    <Trainer
      v-show="trainingStore.step === 3"
      :task="task"
      :dataset="dataset"
      @model="(m) => (trainedModel = m)"
    />

    <Finished
      v-show="trainingStore.step === 4"
      :task="task"
      :model="trainedModel"
    />
  </div>
  <TrainingButtons />
</template>

<script lang="ts" setup>
import { Set } from "immutable";
import { computed, onMounted, ref, toRaw, watch } from "vue";
import { useRouter, useRoute } from "vue-router";

import type {
  Dataset,
  Model,
  Tabular,
  TaskID,
  Text,
  TypedLabeledDataset,
} from "@epfml/discojs";

import { useTrainingStore } from "@/store/training";
import { useTasksStore } from "@/store/tasks";
import Description from "@/components/training/Description.vue";
import Trainer from "@/components/training/Trainer.vue";
import Finished from "@/components/training/Finished.vue";
import type { NamedLabeledImageDataset } from "@/components/dataset_input/types.js";
import DataDescription from "@/components/dataset_input/DataDescription.vue";
import LabeledImageDatasetInput from "@/components/dataset_input/LabeledImageDatasetInput/index.vue";
import TabularDatasetInput from "@/components/dataset_input/TabularDatasetInput.vue";
import TextDatasetInput from "@/components/dataset_input/TextDatasetInput.vue";
import TrainingButtons from "@/components/progress_bars/TrainingButtons.vue";

const router = useRouter();
const route = useRoute();
const trainingStore = useTrainingStore();
const tasksStore = useTasksStore();

// task ID given by the route
const props = defineProps<{
  id: TaskID;
}>();

function setupTrainingStore() {
  trainingStore.setTask(route.params.id as string); // more reliable than props.id
  trainingStore.setStep(1);
}
// Init the task once the taskStore has been loaded successfully
// If it is not we redirect to the task list
const task = computed(() => {
  if (tasksStore.status == "success") {
    return tasksStore.tasks.get(props.id);
  }
  // Redirect to the task list if not loaded yet
  // This happens when refreshing the page, every task are reset when fetched
  if (route.name !== "task-list") {
    router.replace({ name: "task-list" });
  }
  return undefined;
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

const labels = computed(() => Set(task.value?.trainingInformation.LABEL_LIST));

const imageDataset = ref<NamedLabeledImageDataset>();
const tabularDataset = ref<Dataset<Tabular>>();
const textDataset = ref<Dataset<Text>>();
const dataset = computed<TypedLabeledDataset | undefined>(() => {
  if (
    Set.of<unknown>(
      imageDataset.value,
      tabularDataset.value,
      textDataset.value,
    ).filter((d) => d !== undefined).size > 1
  )
    throw new Error("multiple dataset entered");

  if (imageDataset.value !== undefined)
    return [
      "image",
      toRaw(imageDataset.value).map(({ image, label }) => [image, label]),
    ];
  if (tabularDataset.value !== undefined)
    return ["tabular", toRaw(tabularDataset.value)];
  if (textDataset.value !== undefined)
    return ["text", toRaw(textDataset.value)];

  return undefined;
});

const trainedModel = ref<Model>();
</script>
