<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
    <div>
      <IconCard title-placement="center">
        <template #title>
          Connect the CSV file containing a mapping between images and labels
        </template>

        <FileSelection type="tabular" v-model="csvFiles">
          <b>
            The CSV file must contain a header with only two columns (filename,
            label) </b
          >. The file name must NOT include the file extension. You can find an
          example of how to create a CSV
          <a
            class="underline text-blue-400"
            target="_blank"
            href="https://github.com/epfml/disco/blob/develop/docs/examples/dataset_csv_creation.ipynb"
            >here</a
          >.
        </FileSelection>
      </IconCard>
    </div>

    <div
      class="relative"
      :class="{ 'border-disco-cyan rounded-xl border-2': cannotUploadFiles }"
    >
      <div
        v-if="cannotUploadFiles"
        class="w-full h-full absolute z-20 cursor-not-allowed grid place-content-center"
      >
        <div class="text-disco-cyan font-bold text-2xl">Upload CSV first</div>
      </div>

      <IconCard
        title-placement="center"
        :class="{ 'opacity-10': cannotUploadFiles }"
      >
        <template #title> Connect the images </template>

        <FileSelection type="image" multiple v-model="images">
          Drag and drop or browse for the images referenced in the connected CSV
          file.
          <br />
          {{ browsingTip }}
        </FileSelection>
      </IconCard>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as d3 from "d3";
import { Map, Set } from "immutable";
import { computed, ref, watch } from "vue";

import { data } from "@epfml/discojs";

import IconCard from "@/components/containers/IconCard.vue";
import { useToaster } from "@/composables/toaster";

import FileSelection from "../FileSelection.vue";

import { browsingTip } from "./strings.js";

const props = defineProps<{
  datasetBuilder: data.DatasetBuilder<File>;
}>();

const toaster = useToaster();

const csvFiles = ref<Set<File>>();
const filenameToLabel = ref<Map<string, string>>();
const images = ref<Set<File>>();

const cannotUploadFiles = computed(() => filenameToLabel.value === undefined);

watch(csvFiles, async (files) => {
  if (files === undefined) {
    filenameToLabel.value = undefined;
    images.value = undefined;
    return;
  }

  const file = files.first();
  if (file === undefined)
    throw new Error("no file should be checked by FileSelection");

  const text = await file.text();
  const csv = d3.csvParse(text);

  const expectedColumns = Set.of("filename", "label");
  if (!Set(csv.columns).equals(expectedColumns)) {
    csvFiles.value = undefined;
    toaster.error(
      "The CSV file should have a header with these exact 2 column names: " +
        expectedColumns.join(", ") +
        ".",
    );
    return;
  }

  const updatedFilenameToLabel = Map(
    csv.map(({ filename, label }) => [filename, label]),
  );

  if (updatedFilenameToLabel.size !== csv.length) {
    csvFiles.value = undefined;
    toaster.error("The CSV file matches multiple label to the same filename.");
    return;
  }

  filenameToLabel.value = updatedFilenameToLabel;
});

// Match the images to labels via the parsed CSV
watch(images, async (files) => {
  // always start from a clean state
  props.datasetBuilder.clearFiles();

  if (files === undefined) return;

  // Create a map from filename to file to speed up the search
  const filenameToFile = Map(
    files.map((file) => {
      const filename = file.name.split(".").slice(0, -1).join(".");
      return [filename, file] as const;
    }),
  );

  if (filenameToLabel.value === undefined)
    throw new Error("csvFiles should have been called");

  const missingImages = new Error();
  try {
    filenameToLabel.value.forEach((label, filename) => {
      const file = filenameToFile.get(filename);
      if (file === undefined) throw missingImages;

      props.datasetBuilder.addFiles([file], label);
    });
  } catch (e) {
    // reset state
    images.value = undefined;
    props.datasetBuilder.clearFiles();

    if (e === missingImages) {
      toaster.error(
        "Some images listed in the CSV file are missing, " +
          "make sure the CSV filenames don't include file extensions.",
      );
      return;
    }

    throw e;
  }

  if (files.size !== filenameToLabel.value.size)
    toaster.warning(
      "Some inputted images we not found in the CSV: " +
        filenameToFile
          .keySeq()
          .toSet()
          .subtract(filenameToLabel.value.keySeq())
          .join(", "),
    );
});
</script>
