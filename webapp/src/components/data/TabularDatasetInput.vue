<template>
  <div class="grid grid-cols-1">
    <IconCard class="justify-self-center w-full">
      <template #title> My dataset </template>
      <template #icon>
        <Upload />
      </template>
      <template #content>
        <FileSelection @files="setSingleFile($event)" />
        <p v-show="checking" class="text-gray-500">checking...</p>
      </template>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { Range, Set } from "immutable";

import type { Dataset, Tabular } from "@epfml/discojs";
import { parseCSV } from "@epfml/discojs-web";

import Upload from "@/assets/svg/Upload.vue";
import IconCard from "@/components/containers/IconCard.vue";
import { useToaster } from "@/composables/toaster";
import FileSelection from "./FileSelection.vue";

const props = defineProps<{
  validator: (row: Tabular) => boolean;
}>();

const emit = defineEmits<{
  dataset: [dataset: Dataset<Tabular> | undefined];
}>();

const toaster = useToaster();

const checking = ref(false);

async function setSingleFile(files: Set<File> | undefined): Promise<void> {
  if (files === undefined) {
    emit("dataset", undefined);
    return;
  }

  const file = files.first();
  if (file === undefined || files.size > 1)
    throw new Error("excepted a single file");

  if (checking.value)
    throw new Error("setting file without waiting for check of previous one");

  const converted = parseCSV(file)

  // read all to fail early for quicker user reaction
  checking.value = true;
  try {
    for await (const [row, i] of converted.zip(Range(1)))
      if (!props.validator(row))
        throw new Error(`row ${i} is invalid`)
  } catch (e) {
    let msg = "Error when loading CSV";
    if (e instanceof Error) msg = `${msg}: ${e.message}`;
    toaster.error(msg);
    return;
  } finally {
    checking.value = false;
  }

  emit("dataset", converted);
}
</script>
