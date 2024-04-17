<template>
  <div class="grid grid-cols-1">
    <div class="space-y-4 md:space-y-8">
      <div class="flex justify-center">
        <!-- The default data selection mode (connect by group vs connect a csv) depends on task' label number
If the task has few labels then the default is to connect by group, otherwise connecting a CSV is the default -->
        <IconCard title-placement="center">
          <template #title> Select labels by </template>
          <template #content>
            <div class="inline-flex">
              <button
                class="w-40 py-2 uppercase text-lg rounded-l-lg border-2 border-disco-cyan focus:outline-none"
                :class="
                  !connectImagesByGroup
                    ? 'text-white bg-disco-cyan'
                    : 'text-disco-cyan bg-transparent'
                "
                @click="connectImagesByGroup = false"
              >
                csv
              </button>
              <button
                class="w-40 py-2 uppercase text-lg rounded-r-lg border-2 border-disco-cyan focus:outline-none"
                :class="
                  connectImagesByGroup
                    ? 'text-white bg-disco-cyan'
                    : 'text-disco-cyan bg-transparent'
                "
                @click="connectImagesByGroup = true"
              >
                group
              </button>
            </div>
          </template>
        </IconCard>
      </div>

      <!-- Connecting images by group mode -->
      <div
        v-show="connectImagesByGroup"
        class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8"
      >
        <div class="contents">
          <IconCard v-for="label in labels" :key="label">
            <template #title>
              Group label:&nbsp;&nbsp;&nbsp;"{{ label }}"
            </template>
            <template #content>
              <FileSelection @files="setLabeledFiles($event, label)" />
            </template>
          </IconCard>
        </div>
      </div>

      <!-- Connecting images by CSV mode -->
      <div
        v-show="!connectImagesByGroup"
        class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8"
      >
        <div>
          <IconCard title-placement="center">
            <template #title>
              Load the CSV file containing a mapping between images and labels
            </template>
            <template #content>
              <FileSelection
                :accept-files="['.csv']"
                :is-multiple="false"
                :info-text="true"
                @files="setCSV($event)"
              >
                <template #text>
                  The CSV file must contain a header with only two columns (file
                  name, label). The file name must NOT include the file
                  extension. You can find an example of how to create a CSV
                  <a
                    class="underline text-primary-dark dark:text-primary-light"
                    href="https://github.com/epfml/disco/blob/develop/docs/examples/dataset_csv_creation.ipynb"
                    >here</a
                  >.
                </template>
              </FileSelection>
            </template>
          </IconCard>
        </div>

        <div
          :class="{
            'border-disco-cyan rounded-xl border-2': cannotUploadFiles,
          }"
          class="relative"
        >
          <div
            v-if="cannotUploadFiles"
            class="w-full h-full absolute z-20 cursor-not-allowed grid place-content-center"
          >
            <div class="text-disco-cyan font-bold text-2xl">
              Upload CSV first
            </div>
          </div>
          <IconCard
            title-placement="center"
            :class="{ 'opacity-10': cannotUploadFiles }"
          >
            <template #title> Load the folder containing all images </template>
            <template #content>
              <FileSelection :info-text="true" @files="setFolder($event)">
                <template #text>
                  Select a folder containing all images contained in the
                  selected CSV file.
                </template>
              </FileSelection>
            </template>
          </IconCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Map, Set } from "immutable";
import { computed, ref } from "vue";
import { csvParse } from "d3";

import type { Image } from "@epfml/discojs";
import { Dataset } from "@epfml/discojs";

import IconCard from "@/components/containers/IconCard.vue";
import FileSelection from "./FileSelection.vue";

export type NamedLabeledImageDataset = Dataset<{
  image: Image;
  label: string;
  filename: string;
}>;

const props = defineProps<{
  labels: Set<string>;
}>();
const emit = defineEmits<{
  dataset: [dataset: NamedLabeledImageDataset];
}>();

interface CSVRow {
  filename: string;
  label: string;
}
function isCSVRow(raw: unknown): raw is CSVRow {
  if (typeof raw !== "object" || raw === null) return false;

  const { filename, label }: Partial<CSVRow> = raw;

  if (typeof filename !== "string" || typeof label !== "string") return false;

  const _: Record<keyof CSVRow, unknown> = {
    filename,
    label,
  } satisfies CSVRow;

  return true;
}

const csvRows = ref<Map<string, string>>(); // filename -> label

const connectImagesByGroup = ref(props.labels.size <= 2);

const labeledFiles = ref<Map<string, Set<File>>>(Map());
const fullyFilled = computed(
  () =>
    labeledFiles.value.size === props.labels.size &&
    labeledFiles.value.valueSeq().every((files) => !files.isEmpty()),
);

const cannotUploadFiles = computed(() => !csvRows.value);

async function setCSV(files: Set<File> | undefined): Promise<void> {
  if (files === undefined) {
    csvRows.value = undefined;
    return;
  }
  if (files.size > 1)
    throw new Error("got multiple files but excepted at most one");

  const parsed: unknown[] | undefined = await files
    .map((file) => file.text().then((text) => csvParse(text)))
    .first();
  if (parsed === undefined) {
    csvRows.value = undefined;
    return;
  }
  if (!parsed.every(isCSVRow)) throw new Error("some row of CSV are not valid");

  const filenameToLabel = Map(parsed.map((row) => [row.filename, row.label]));
  if (filenameToLabel.size !== parsed.length)
    throw new Error("some filenames are labeled multipled times");

  csvRows.value = filenameToLabel;
}

function setLabeledFiles(files: Set<File> | undefined, label: string): void {
  if (files === undefined) {
    labeledFiles.value = labeledFiles.value.delete(label);
    return;
  }

  const updatedLabeledFiles = labeledFiles.value.set(label, files);
  labeledFiles.value = updatedLabeledFiles;

  if (fullyFilled.value)
    emit(
      "dataset",
      new Dataset(async function* () {
        for (const [label, files] of updatedLabeledFiles.entries()) {
          for (const file of files) {
            const image = new Image();
            const url = URL.createObjectURL(file);
            image.src = url;
            await image.decode();
            URL.revokeObjectURL(url);

            const [width, height] = [image.naturalWidth, image.naturalHeight];

            const context = new OffscreenCanvas(width, height).getContext("2d");
            if (context === null)
              throw new Error("unable to setup image convertor");
            context.drawImage(image, 0, 0);
            const data = new Uint8Array(
              context.getImageData(0, 0, width, height).data,
            );

            yield {
              filename: file.name,
              image: { width, height, data },
              label,
            };
          }
        }
      }),
    );
}

function setFolder(files: Set<File> | undefined): void {
  if (files === undefined) {
    labeledFiles.value = Map();
    return;
  }

  const rows = csvRows.value;
  if (rows === undefined)
    throw new Error("adding folder but no valid CSV loaded");

  labeledFiles.value = files
    .flatMap((file) => {
      const filename = file.name.split(".").slice(0, -1).join(".");
      const label = rows.get(filename);
      if (label === undefined) return []; // irrelevant file
      return [[file, label] as const];
    })
    .reduce(
      (acc, [file, label]) =>
        acc.set(label, acc.get(label, Set<File>()).add(file)),
      Map(),
    );

  if (!fullyFilled.value)
    throw new Error("given folder is missing some files referenced in the CSV");

  emit("dataset", new Dataset(async function* () {}));
}
</script>
