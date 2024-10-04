<template>
  <slot name="header" />

  <ImageDatasetInput v-if="type === 'image'" v-model="imageDataset" />
  <TabularDatasetInput v-if="type === 'tabular'" v-model="tabularDataset" />
  <TextDatasetInput v-if="type === 'text'" v-model="textDataset" />
</template>

<script setup lang="ts" generic="D extends DataType">
import { Set } from "immutable";
import { computed, ref, toRaw, watch } from "vue";

import type { DataType, Task } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster.js";

import ImageDatasetInput from "./ImageDatasetInput.vue";
import TabularDatasetInput from "./TabularDatasetInput.vue";
import TextDatasetInput from "./TextDatasetInput.vue";
import type { UnlabeledDataset } from "./types.js";
import * as validate from "./validate.js";

const toaster = useToaster();

const props = defineProps<{
  task: Task<D>;
}>();

const type = computed<D>(() => props.task.trainingInformation.dataType as D);

const dataset = defineModel<UnlabeledDataset[D]>();
watch(dataset, (dataset: UnlabeledDataset[D] | undefined) => {
  // only allow unsetting dataset
  if (dataset !== undefined) return;

  imageDataset.value = undefined;
  tabularDataset.value = undefined;
  textDataset.value = undefined;
});

const imageDataset = ref<UnlabeledDataset["image"]>();
const tabularDataset = ref<UnlabeledDataset["tabular"]>();
const textDataset = ref<UnlabeledDataset["text"]>();
watch([imageDataset, tabularDataset, textDataset], async () => {
  switch (type.value) {
    case "image":
      dataset.value = imageDataset.value as UnlabeledDataset[D];
      break;
    case "tabular": {
      const task = props.task as Task<"tabular">;

      if (tabularDataset.value === undefined) {
        dataset.value = undefined;
        return;
      }

      try {
        await validate.tabular(
          Set(task.trainingInformation.inputColumns),
          toRaw(tabularDataset.value),
        );
      } catch (e) {
        let msg = "Error when loading CSV";
        if (e instanceof Error) msg = `${msg}: ${e.message}`;
        toaster.error(msg);
      }

      dataset.value = tabularDataset.value as UnlabeledDataset[D];
      break;
    }
    case "text":
      dataset.value = textDataset.value as UnlabeledDataset[D];
      break;
    default: {
      const _: never = type.value;
      throw new Error("should never happen");
    }
  }
});
</script>
