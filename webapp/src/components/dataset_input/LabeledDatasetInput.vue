<template>
  <slot name="header" />

  <LabeledImageDatasetInput
    v-if="task.dataType === 'image'"
    v-model="selectedSource"
    :labels="
      Set((task as Task<'image', Network>).trainingInformation.LABEL_LIST)
    "
  />
  <TabularDatasetInput
    v-if="task.dataType === 'tabular'"
    v-model="selectedSource"
  />
  <TextDatasetInput v-if="task.dataType === 'text'" v-model="selectedSource" />
</template>

<script setup lang="ts" generic="D extends DataType">
import { Set } from "immutable";
import { ref, toRaw, watch } from "vue";
import type { DataType, Network, Task } from "@epfml/discojs";
import { loadCSV } from "@epfml/discojs-web";
import { useToaster } from "@/composables/toaster.js";
import LabeledImageDatasetInput from "./LabeledImageDatasetInput/index.vue";
import TabularDatasetInput from "./TabularDatasetInput.vue";
import TextDatasetInput from "./TextDatasetInput.vue";
import type { DatasetSource } from "./source";
import * as validate from "./validate.js";

const toaster = useToaster();
const props = defineProps<{ task: Task<D, Network> }>();
const datasetSource = defineModel<DatasetSource>();
const selectedSource = ref<DatasetSource>();

watch(datasetSource, (value) => {
  if (value === undefined) selectedSource.value = undefined;
});
watch(
  [() => props.task, selectedSource],
  async ([task, source], _, onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    if (source !== undefined && source.type !== task.dataType) {
      selectedSource.value = undefined;
      datasetSource.value = undefined;
      return;
    }
    if (source?.type === "tabular" && task.dataType === "tabular") {
      try {
        const { inputColumns, outputColumn } = (
          task as Task<"tabular", Network>
        ).trainingInformation;
        // Parse once for early feedback; the training dataset is built in the worker.
        await validate.tabular(
          Set(inputColumns).add(outputColumn),
          loadCSV(source.file),
        );
      } catch (error) {
        if (cancelled) return;
        toaster.error(
          error instanceof Error
            ? `Error when loading CSV: ${error.message}`
            : "Error when loading CSV",
        );
        selectedSource.value = undefined;
        datasetSource.value = undefined;
        return;
      }
    }
    if (!cancelled) datasetSource.value = toRaw(source);
  },
);
</script>
