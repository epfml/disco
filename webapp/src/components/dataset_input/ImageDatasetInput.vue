<template>
  <DatasetInput>
    <FileSelection type="image" v-model="images" />
  </DatasetInput>
</template>

<script setup lang="ts">
import { Set } from "immutable";
import { ref, watch } from "vue";

import type { data } from "@epfml/discojs";

import DatasetInput from "./DatasetInput.vue";
import FileSelection from "./FileSelection.vue";

const props = defineProps<{
  datasetBuilder: data.DatasetBuilder<File>;
}>();

const images = ref<Set<File>>();
watch(images, (images) => {
  if (images === undefined) {
    props.datasetBuilder.clearFiles();
    return;
  }

  props.datasetBuilder.addFiles(images.toArray());
});
</script>
