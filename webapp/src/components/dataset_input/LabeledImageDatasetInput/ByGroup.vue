<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
    <div class="contents">
      <IconCard v-for="(files, label) in labelToFiles" :key="label">
        <template #title> Group label:&nbsp;&nbsp;{{ label }} </template>

        <FileSelection type="image" multiple v-model="files.value">
          {{ browsingTip }}
        </FileSelection>
      </IconCard>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Set } from "immutable";
import { computed, ref, watch } from "vue";

import { data } from "@epfml/discojs";

import IconCard from "@/components/containers/IconCard.vue";

import FileSelection from "../FileSelection.vue";

import { browsingTip } from "./strings.js";

const props = defineProps<{
  labels: Set<string>;
  datasetBuilder: data.DatasetBuilder<File>;
}>();

const labelToFiles = computed(() =>
  Object.fromEntries(
    props.labels.map((label) => [label, ref<Set<File>>()] as const),
  ),
);

watch(Object.values(labelToFiles.value), () => {
  props.datasetBuilder.clearFiles();

  for (const [label, files] of Object.entries(labelToFiles.value)) {
    if (files.value === undefined) continue;
    props.datasetBuilder.addFiles(files.value.toArray(), label);
  }
});
</script>
