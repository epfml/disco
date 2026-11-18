<template>
  <div class="grid grid-cols-1">
    <DatasetInput>
      <FileSelection v-model="files" type="text" no-upload />
    </DatasetInput>
  </div>
</template>

<script lang="ts" setup>
import type { Set } from "immutable";
import { ref, watch } from "vue";

import type { DatasetSource } from "./source";

import DatasetInput from "./DatasetInput.vue";
import FileSelection from "./FileSelection.vue";

const datasetSource = defineModel<DatasetSource>();
watch(datasetSource, (value) => {
  if (value === undefined) files.value = undefined;
});

const files = ref<Set<File>>();
watch(files, (files) => {
  if (files === undefined) {
    datasetSource.value = undefined;
    return;
  }

  const file = files.first();
  if (file === undefined || files.size > 1)
    // enforced by <FileSelection multiple=false />
    throw new Error("expected a single file");

  datasetSource.value = { type: "text", file };
});
</script>
