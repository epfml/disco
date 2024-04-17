<template>
  <div class="flex flex-col space-y-4 md:space-y-8">
    <DataHarmonization :task="props.task" />
    <ImageDatasetInput
      v-if="task.trainingInformation.dataType === 'image'"
      :labels="Set(task.trainingInformation.LABEL_LIST ?? [])"
      @dataset="setImageDataset($event)"
    />
    <TabularDatasetInput
      v-else-if="task.trainingInformation.dataType === 'tabular'"
      :validator="validator"
      @dataset="setTabularDataset($event)"
    />
  </div>
</template>

<script setup lang="ts">
import { Set } from "immutable";
import { computed } from "vue";

import type { Dataset, Tabular, Task, Text } from "@epfml/discojs";

import DataHarmonization from "./DataHarmonization.vue";
import ImageDatasetInput, {
  type NamedLabeledImageDataset,
} from "./ImageDatasetInput.vue";
import TabularDatasetInput from "./TabularDatasetInput.vue";

export type TypedNamedDataset =
  | ["image", NamedLabeledImageDataset]
  | ["tabular", Dataset<Tabular>]
  | ["text", Dataset<Text>];

const props = defineProps<{
  task: Task;
}>();
const emit = defineEmits<{
  dataset: [TypedNamedDataset | undefined];
}>();

const validator = computed(() => {
  const columns = Set(props.task.trainingInformation.inputColumns).union(
    props.task.trainingInformation.outputColumn ?? [],
  );

  return (row: Tabular) => Set(Object.keys(row)).isSuperset(columns);
});

function setTabularDataset(value: Dataset<Tabular> | undefined) {
  if (value === undefined) emit("dataset", undefined);
  else emit("dataset", ["tabular", value]);
}
function setImageDataset(value: NamedLabeledImageDataset | undefined) {
  if (value === undefined) emit("dataset", undefined);
  else emit("dataset", ["image", value]);
}
</script>
