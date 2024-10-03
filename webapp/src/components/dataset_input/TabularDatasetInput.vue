<template>
  <div class="grid grid-cols-1">
    <DatasetInput>
      <FileSelection type="tabular" v-model="files" />
    </DatasetInput>
  </div>
</template>

<script lang="ts" setup>
import { Set } from "immutable";
import { ref, watch } from "vue";

import type { Dataset, Tabular } from "@epfml/discojs";
import { loadCSV } from "@epfml/discojs-web";

import DatasetInput from "./DatasetInput.vue";
import FileSelection from "./FileSelection.vue";

const dataset = defineModel<Dataset<Tabular>>();
watch(dataset, (dataset: Dataset<Tabular> | undefined) => {
  if (dataset === undefined) files.value = undefined;
});

const files = ref<Set<File>>();
watch(files, (files: Set<File> | undefined) => {
  if (files === undefined) {
    dataset.value = files;
    return;
  }

  const file = files.first();
  if (file === undefined || files.size > 1)
    // enforced by <FileSelection multiple=false />
    throw new Error("expected a single file");

  dataset.value = loadCSV(file);
});
</script>
