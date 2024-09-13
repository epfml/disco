<template>
  <slot name="header" />

  <LabeledImageDatasetInput
    v-if="task.trainingInformation.dataType === 'image'"
    v-model="imageDataset"
    :labels="Set(task.trainingInformation.LABEL_LIST)"
  />
  <TabularDatasetInput
    v-if="task.trainingInformation.dataType === 'tabular'"
    v-model="tabularDataset"
  />
  <TextDatasetInput
    v-if="task.trainingInformation.dataType === 'text'"
    v-model="textDataset"
  />
</template>

<script setup lang="ts" generic="D extends DataType">
import { Set } from "immutable";
import { ref, toRaw, watch } from "vue";

import type { DataType, Task } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster.js";

import LabeledImageDatasetInput from "./LabeledImageDatasetInput/index.vue";
import TabularDatasetInput from "./TabularDatasetInput.vue";
import TextDatasetInput from "./TextDatasetInput.vue";
import type { LabeledDataset } from "./types.js";
import * as validate from "./validate.js";

const toaster = useToaster();

const props = defineProps<{
  task: Task<D>;
}>();

const dataset = defineModel<LabeledDataset[D]>();
watch(dataset, (dataset: LabeledDataset[D] | undefined) => {
  // only allow unsetting dataset
  if (dataset !== undefined) return;

  imageDataset.value = undefined;
  tabularDataset.value = undefined;
  textDataset.value = undefined;
});

const imageDataset = ref<LabeledDataset["image"]>();
const tabularDataset = ref<LabeledDataset["tabular"]>();
const textDataset = ref<LabeledDataset["text"]>();
watch([props, imageDataset, tabularDataset, textDataset], async () => {
  switch (props.task.trainingInformation.dataType) {
    case "image":
      dataset.value = toRaw(imageDataset.value) as LabeledDataset[D];
      break;
    case "tabular": {
      const task = props.task as Task<"tabular">;

      if (tabularDataset.value === undefined) {
        dataset.value = undefined;
        return;
      }

      try {
        await validate.tabular(
          Set(task.trainingInformation.inputColumns).add(
            task.trainingInformation.outputColumn,
          ),
          toRaw(tabularDataset.value),
        );
      } catch (e) {
        let msg = "Error when loading CSV";
        if (e instanceof Error) msg = `${msg}: ${e.message}`;
        toaster.error(msg);

        tabularDataset.value = undefined;
      }

      dataset.value = toRaw(tabularDataset.value) as LabeledDataset[D];
      break;
    }
    case "text":
      dataset.value = textDataset.value as LabeledDataset[D];
      break;
    default: {
      const _: never = props.task.trainingInformation;
      throw new Error("should never happen");
    }
  }
});
</script>
