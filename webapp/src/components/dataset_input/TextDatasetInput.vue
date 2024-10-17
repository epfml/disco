<template>
  <div class="grid grid-cols-1">
    <DatasetInput>
      <FileSelection type="text" v-model="files" :loading="loadingTokenizer"/>
    </DatasetInput>
  </div>
</template>

<script lang="ts" setup>
import { Set } from "immutable";
import { ref, watch } from "vue";

import type { Text, Task } from "@epfml/discojs";
import { Dataset, models } from "@epfml/discojs";
import { loadText } from "@epfml/discojs-web";

import DatasetInput from "./DatasetInput.vue";
import FileSelection from "./FileSelection.vue";

const { task } = defineProps<{ task: Task }>()

const dataset = defineModel<Dataset<Text>>();
  watch(dataset, (dataset: Dataset<Text> | undefined) => {
    if (dataset === undefined) files.value = undefined;
  });

const blockSize = task.trainingInformation.maxSequenceLength;
if (blockSize === undefined)
  throw new Error(`Expected maxSequenceLength to be defined for task ${task.id}`);

const loadingTokenizer = ref(false);
const files = ref<Set<File>>();
watch(files, async (files) => {
  if (files === undefined) {
    dataset.value = undefined;
    return;
  }

  const file = files.first();
  if (file === undefined || files.size > 1)
    // enforced by <FileSelection multiple=false />
    throw new Error("excepted a single file");

  // Set a loadingTokenizer indicator while loadingTokenizer the tokenizer
  loadingTokenizer.value = true;
  const tokenizer = await models.getTaskTokenizer(task)
  dataset.value = loadText(file, tokenizer, blockSize);
  loadingTokenizer.value = false;
});
</script>
