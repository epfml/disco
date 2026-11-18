<template>
  <slot name="header" />

  <ImageDatasetInput v-if="type === 'image'" v-model="imageDataset" />
  <TabularDatasetInput v-if="type === 'tabular'" v-model="tabularSource" />
  <TextDatasetInput v-if="type === 'text'" v-model="textSource" />
</template>

<script setup lang="ts" generic="D extends DataType">
import { Set } from "immutable";
import { computed, ref, watch } from "vue";

import { loadCSV, loadText } from "@epfml/discojs-web";
import type { DatasetSource } from "./source";
import type { DataType, Network, Task } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster.js";

import ImageDatasetInput from "./ImageDatasetInput.vue";
import TabularDatasetInput from "./TabularDatasetInput.vue";
import TextDatasetInput from "./TextDatasetInput.vue";
import type { UnlabeledDataset } from "./types.js";
import * as validate from "./validate.js";

const toaster = useToaster();

const props = defineProps<{
  task: Task<D, Network>;
}>();

const type = computed<D>(() => props.task.dataType as D);

const dataset = defineModel<UnlabeledDataset[D]>();
watch(dataset, (dataset: UnlabeledDataset[D] | undefined) => {
  // only allow unsetting dataset
  if (dataset !== undefined) return;

  imageDataset.value = undefined;
  tabularSource.value = undefined;
  textSource.value = undefined;
});

const imageDataset = ref<UnlabeledDataset["image"]>();
const tabularSource = ref<DatasetSource>();
const textSource = ref<DatasetSource>();
watch([imageDataset, tabularSource, textSource], async () => {
  switch (type.value) {
    case "image":
      dataset.value = imageDataset.value as UnlabeledDataset[D];
      break;
    case "tabular": {
      const task = props.task as Task<"tabular", Network>;

      if (tabularSource.value?.type !== "tabular") {
        dataset.value = undefined;
        return;
      }

      const tabularDataset = loadCSV(tabularSource.value.file);
      try {
        await validate.tabular(
          Set(task.trainingInformation.inputColumns),
          tabularDataset,
        );
      } catch (e) {
        let msg = "Error when loading CSV";
        if (e instanceof Error) msg = `${msg}: ${e.message}`;
        toaster.error(msg);

        tabularSource.value = undefined;
      }

      dataset.value =
        tabularSource.value === undefined
          ? undefined
          : (tabularDataset as UnlabeledDataset[D]);
      break;
    }
    case "text":
      dataset.value =
        textSource.value?.type === "text"
          ? (loadText(textSource.value.file) as UnlabeledDataset[D])
          : undefined;
      break;
    default: {
      const _: never = type.value;
      throw new Error("should never happen");
    }
  }
});
</script>
