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
import { Map, Set } from "immutable";
import { computed, ref, watch } from "vue";

import { Dataset } from "@epfml/discojs";
import { loadImage } from "@epfml/discojs-web";

import IconCard from "@/components/containers/IconCard.vue";

import FileSelection from "../FileSelection.vue";

import type { NamedLabeledImageDataset } from "../types.js";
import { browsingTip } from "./strings.js";

const props = defineProps<{
  labels: Set<string>;
}>();

const dataset = defineModel<NamedLabeledImageDataset>();
watch(dataset, (dataset: NamedLabeledImageDataset | undefined) => {
  if (dataset === undefined)
    Object.values(labelToFiles.value).forEach((files) => {
      files.value = undefined;
    });
});

// using an object instead of a map as vue needs to update in place
const labelToFiles = computed(() =>
  Object.fromEntries(
    props.labels.map((label) => [label, ref<Set<File>>()] as const),
  ),
);

watch(Object.values(labelToFiles.value), () => {
  const labelsAndFiles = Map(Object.entries(labelToFiles.value))
    .toSeq()
    .flatMap(
      (files, label) => files.value?.map((f) => [label, f] as const) ?? [],
    );

  dataset.value = new Dataset(labelsAndFiles).map(async ([label, file]) => ({
    filename: file.name,
    image: await loadImage(file),
    label,
  }));
});
</script>
