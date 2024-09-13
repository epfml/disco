<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
    <div class="contents">
      <IconCard v-for="[label, files] in labelsAndFiles" :key="label">
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
import type { Ref, WatchHandle } from "vue";
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

const dataset = defineModel<NamedLabeledImageDataset | undefined>();
watch(dataset, (dataset: NamedLabeledImageDataset | undefined) => {
  if (dataset === undefined)
    labelsAndFiles.value.forEach(([_, files]) => {
      files.value = undefined;
    });
});

const labelsAndFiles = computed<Array<[string, Ref<Set<File> | undefined>]>>(
  (oldArray) => {
    const old = Map(oldArray);

    return props.labels
      .valueSeq()
      .sort()
      .map(
        (label) =>
          [label, old.get(label) ?? ref()] as [
            string,
            Ref<Set<File> | undefined>,
          ],
      )
      .toArray();
  },
);

let watcher: WatchHandle;
function refreshWatcher() {
  watcher?.(); // stop old watcher
  watcher = watch(
    labelsAndFiles.value.map(([_, files]) => files),
    () => {
      const expanded = labelsAndFiles.value.flatMap(
        ([label, files]) =>
          files.value?.map((f) => [label, f] as const)?.toArray() ?? [],
      );

      dataset.value = new Dataset(expanded).map(async ([label, file]) => ({
        filename: file.name,
        image: await loadImage(file),
        label,
      }));
    },
  );
}
refreshWatcher();
watch(labelsAndFiles, () => refreshWatcher());
</script>
