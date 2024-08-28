<template>
  <DatasetInput>
    <FileSelection type="image" v-model="files" multiple />
  </DatasetInput>
</template>

<script setup lang="ts">
import { Set } from "immutable";
import { ref, watch } from "vue";

import type { Image } from "@epfml/discojs";
import { Dataset } from "@epfml/discojs";
import { loadImage } from "@epfml/discojs-web";

import DatasetInput from "./DatasetInput.vue";
import FileSelection from "./FileSelection.vue";

export type NamedImageDataset = Dataset<{
  image: Image;
  filename: string;
}>;

const dataset = defineModel<NamedImageDataset>();
watch(dataset, (dataset: NamedImageDataset | undefined) => {
  if (dataset === undefined) files.value = undefined;
});

const files = ref<Set<File>>();
watch(files, (files) => {
  if (files === undefined) {
    dataset.value = undefined;
    return;
  }

  dataset.value = new Dataset(files).map(async (file) => ({
    image: await loadImage(file),
    filename: file.name,
  }));
});
</script>
