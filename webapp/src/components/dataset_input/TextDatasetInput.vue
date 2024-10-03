<template>
  <div class="grid grid-cols-1">
    <DatasetInput>
      <FileSelection type="text" v-model="files" />
    </DatasetInput>
  </div>
</template>

<script lang="ts" setup>
import { Set } from "immutable";
import { ref, watch } from "vue";

import type { Text } from "@epfml/discojs";
import { Dataset } from "@epfml/discojs";
import { loadText } from "@epfml/discojs-web";

import DatasetInput from "./DatasetInput.vue";
import FileSelection from "./FileSelection.vue";

const dataset = defineModel<Dataset<Text>>();
watch(dataset, (dataset: Dataset<Text> | undefined) => {
  if (dataset === undefined) files.value = undefined;
});

const files = ref<Set<File>>();
watch(files, (files) => {
  if (files === undefined) {
    dataset.value = undefined;
    return;
  }

  const file = files.first();
  if (file === undefined || files.size > 1)
    // enforced by <FileSelection multiple=false />
    throw new Error("expected a single file");

  dataset.value = loadText(file);
});
</script>
