<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 cards-gap">
    <div>
      <IconCard title-placement="center">
        <template #title>
          Connect the CSV file containing a mapping between images and labels
        </template>

        <FileSelection v-model="csvFiles" type="tabular" no-upload>
          <b>
            The CSV file must contain a header with only two columns (filename,
            label) </b
          >. The file name must NOT include the file extension. You can find an
          example of how to create a CSV
          <a
            class="underline text-blue-400"
            target="_blank"
            href="https://github.com/epfml/disco/blob/main/docs/examples/dataset_csv_creation.ipynb"
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

        <FileSelection v-model="images" type="image" multiple no-upload>
          Drag and drop or browse for the images referenced in the connected CSV
          file.
          <br />
        </FileSelection>
      </IconCard>
    </div>
  </div>
</template>

<script lang="ts" setup>
import * as d3 from "d3";
import type { Set } from "immutable";
import { Map } from "immutable";
import { computed, ref, watch } from "vue";

import { Dataset } from "@epfml/discojs";
import { loadImage } from "@epfml/discojs-web";

import IconCard from "@/components/containers/IconCard.vue";
import { useToaster } from "@/composables/toaster";

import FileSelection from "../FileSelection.vue";

import type { NamedLabeledImageDataset } from "../types.js";

const toaster = useToaster();

const dataset = defineModel<NamedLabeledImageDataset>();
watch(dataset, (dataset: NamedLabeledImageDataset | undefined) => {
  if (dataset === undefined) csvFiles.value = undefined; // trickles down
});

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

  class MalformedCSVError extends Error {}

  try {
    const updatedFilenameToLabel = Map(
      csv.map(({ filename, label }) => {
        if (filename === undefined || label === undefined)
          throw new MalformedCSVError(
            "The CSV file should have a header with these exact 2 column names: filename & label.",
          );
        return [filename, label];
      }),
    );

    if (updatedFilenameToLabel.size !== csv.length)
      throw new MalformedCSVError(
        "The CSV file matches multiple label to the same filename.",
      );

    filenameToLabel.value = updatedFilenameToLabel;
  } catch (e) {
    if (!(e instanceof MalformedCSVError)) throw e;

    csvFiles.value = undefined;
    toaster.error(e.message);
  }
});

// match the images to labels via the parsed CSV
watch(images, (files) => {
  if (files === undefined) {
    dataset.value = undefined;
    return;
  }

  // create a map from filename to file to speed up the search
  const filenameToFile = Map(
    files.map((file) => {
      const filename = file.name.split(".").slice(0, -1).join(".");
      return [filename, file] as const;
    }),
  );

  if (filenameToLabel.value === undefined)
    throw new Error("csvFiles should have been called");

  if (files.size !== filenameToLabel.value.size)
    toaster.warning(
      "Some inputted images we not found in the CSV: " +
        filenameToFile
          .keySeq()
          .toSet()
          .subtract(filenameToLabel.value.keySeq())
          .join(", "),
    );

  const missingImages = new Error();
  let fileToLabel: Iterable<[File, string]>;
  try {
    fileToLabel = filenameToLabel.value.mapEntries(([filename, label]) => {
      const file = filenameToFile.get(filename);
      if (file === undefined) throw missingImages;
      return [file, label];
    });
  } catch (e) {
    images.value = undefined;

    if (e === missingImages) {
      toaster.error(
        "Some images listed in the CSV file are missing, " +
          "make sure the CSV filenames don't include file extensions.",
      );
      return;
    }

    throw e;
  }

  dataset.value = new Dataset(fileToLabel).map(async ([file, label]) => ({
    filename: file.name,
    image: await loadImage(file),
    label,
  }));
});
</script>
