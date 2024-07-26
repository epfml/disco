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

import { data } from "@epfml/discojs";

import DatasetInput from "./DatasetInput.vue";
import FileSelection from "./FileSelection.vue";

const props = defineProps<{
  datasetBuilder: data.DatasetBuilder<File>;
}>();

const files = ref<Set<File>>();

watch(files, (files) => {
  if (files === undefined) {
    props.datasetBuilder.clearFiles();
    return;
  }

  props.datasetBuilder.addFiles(files.toArray());
});
</script>
