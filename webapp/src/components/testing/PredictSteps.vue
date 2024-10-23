<template>
  <!-- Language model prompting is currently unavailable   -->
  <div
    v-if="task.trainingInformation.dataType === 'text'"
    v-show="validationStore.step !== 0"
  >
    <div class="flex justify-center items-center mb-4">
      <span
        class="shrink-0 py-4 px-4 bg-purple-100 dark:text-disco-dark-blue rounded-md flex flex-row gap-x-4 items-center"
      >
        <InfoIcon custom-class="min-w-6 min-h-6 w-6 h-6 text-slate-600" />

        Prompting a language model will be available soon!
      </span>
    </div>
  </div>

  <div
    v-if="validationStore.step === 1"
    class="flex flex-col space-y-4 md:space-y-8"
  >
    <DataDescription :task="task" />

    <ImageDatasetInput
      v-if="task.trainingInformation.dataType === 'image'"
      v-model="imageDataset"
    />
    <TabularDatasetInput
      v-if="task.trainingInformation.dataType === 'tabular'"
      v-model="tabularDataset"
    />
    <TextDatasetInput
      v-if="task.trainingInformation.dataType === 'text'"
      v-model="textDataset"
      :task="task"
    />
  </div>

  <div v-if="validationStore.step === 2" class="space-y-8">
    <IconCard class="mx-auto mt-10 lg:w-1/2" title-placement="left">
      <template #title> Run model inference </template>

      <div v-if="generator === undefined">
        By clicking the button below, you will be able to predict using the
        selected model with chosen dataset of yours.

        <div class="flex justify-center mt-4">
          <CustomButton @click="startInference()"> predict </CustomButton>
        </div>
      </div>
      <div v-else>
        <div class="flex justify-center">
          <CustomButton @click="stopInference()"> stop inference </CustomButton>
        </div>
      </div>
    </IconCard>

    <div class="p-4 mx-auto lg:w-1/2 h-full bg-white dark:bg-slate-950 rounded-md">
      <!-- header -->
      <h4 class="p-4 border-b text-lg font-semibold text-slate-500 dark:text-slate-300">
        Inference metrics
      </h4>
      <!-- stats -->
      <div class="flex justify-center p-4 font-medium text-slate-500 dark:text-slate-400">
        <div class="text-center">
          <span class="text-2xl">
            {{ predictions?.results.size ?? 0 }}
          </span>
          <span class="text-sm">&nbsp;samples visited</span>
        </div>
      </div>
    </div>

    <div v-if="predictions !== undefined">
      <div class="mx-auto lg:w-1/2 text-center pb-8">
        <CustomButton @click="saveCsv()"> download as csv </CustomButton>
      </div>

      <!-- Image gallery -->
      <div v-if="predictions.type === 'image'" class="grid grid-cols-6 gap-6">
        <ImageCard
          v-for="(result, index) in predictions.results"
          :key="index"
          :image="result.input.image"
        >
          <template #title>
            <span class="font-bold">{{ result.output }}</span>
          </template>
        </ImageCard>
      </div>

      <div
        v-else-if="predictions.type === 'tabular'"
        class="mx-auto lg:w-3/4 h-full bg-white dark:bg-slate-950 rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
      >
        <TableLayout
          :columns="predictions.labels.input.concat(predictions.labels.output)"
          :rows="
            predictions.results.map(({ input, output }) => input.push(output))
          "
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import * as d3 from "d3";
import createDebug from "debug";
import { List, Range, Set } from "immutable";
import { computed, ref, toRaw, watch } from "vue";

import type { Dataset, Model, Tabular, Task, Text } from "@epfml/discojs";
import { Validator } from "@epfml/discojs";

import InfoIcon from "@/assets/svg/InfoIcon.vue";
import { useToaster } from "@/composables/toaster";
import { useValidationStore } from "@/store/validation";

import IconCard from "@/components/containers/IconCard.vue";
import ImageCard from "@/components/containers/ImageCard.vue";
import TableLayout from "@/components/containers/TableLayout.vue";
import DataDescription from "@/components/dataset_input/DataDescription.vue";
import ImageDatasetInput from "@/components/dataset_input/ImageDatasetInput.vue";
import TabularDatasetInput from "@/components/dataset_input/TabularDatasetInput.vue";
import TextDatasetInput from "@/components/dataset_input/TextDatasetInput.vue";
import CustomButton from "@/components/simple/CustomButton.vue";

import type {
  NamedImageDataset,
  TypedNamedDataset,
} from "@/components/dataset_input/types.js";

const debug = createDebug("webapp:testing:PredictSteps");
const toaster = useToaster();
const validationStore = useValidationStore();

const props = defineProps<{
  task: Task;
  model: Model;
}>();

type Results =
  | {
      type: "image";
      results: List<{
        input: {
          filename: string;
          image: ImageData;
        };
        output: string;
      }>;
    }
  | {
      type: "tabular";
      labels: { input: List<string>; output: List<string> };
      results: List<{ input: List<string>; output: string }>;
    };

const imageDataset = ref<NamedImageDataset>();
const tabularDataset = ref<Dataset<Tabular>>();
const textDataset = ref<Dataset<Text>>();
const dataset = computed<TypedNamedDataset | undefined>(() => {
  if (
    Set.of<unknown>(
      imageDataset.value,
      tabularDataset.value,
      textDataset.value,
    ).filter((d) => d !== undefined).size > 1
  )
    throw new Error("multiple dataset entered");

  if (imageDataset.value !== undefined)
    return ["image", toRaw(imageDataset.value)];
  if (tabularDataset.value !== undefined)
    return ["tabular", toRaw(tabularDataset.value)];
  if (textDataset.value !== undefined)
    return ["text", toRaw(textDataset.value)];

  return undefined;
});

const generator = ref<AsyncGenerator<number, void>>();
const predictions = ref<Results>();

watch(tabularDataset, async (dataset) => {
  if (dataset === undefined) return;

  const { inputColumns } = props.task.trainingInformation;
  if (inputColumns === undefined)
    throw new Error("tabular task without input columns");
  const wantedColumns = Set(inputColumns);

  try {
    for await (const [columns, i] of toRaw(dataset)
      .map((row) => Set(Object.keys(row)))
      .zip(Range(1)))
      if (!columns.isSuperset(wantedColumns))
        throw new Error(
          `row ${i} is missing columns ${wantedColumns.subtract(columns).join(", ")}`,
        );
  } catch (e) {
    let msg = "Error when loading CSV";
    if (e instanceof Error) msg = `${msg}: ${e.message}`;
    toaster.error(msg);

    tabularDataset.value = undefined;
    return;
  }
});

async function startInference(): Promise<void> {
  if (dataset.value === undefined) {
    toaster.error("Upload a dataset first");
    return;
  }

  toaster.info("Model inference started");
  try {
    switch (dataset.value[0]) {
      case "image":
        await startImageInference(toRaw(dataset.value)[1]);
        break;
      case "tabular":
        await startTabularInference(toRaw(dataset.value)[1]);
        break;
      case "text":
        throw new Error("disabled dataset type");
    }

    toaster.success("Model inference finished successfully!");
  } catch (e) {
    debug("while infering: %o", e);
    toaster.error("Something went wrong during model inference");
  }
}

async function startImageInference(dataset: NamedImageDataset): Promise<void> {
  const labels = List(props.task.trainingInformation.LABEL_LIST);
  const validator = new Validator(props.task, toRaw(props.model));

  let results: (Results & { type: "image" })["results"] = List();
  try {
    generator.value = await validator.infer([
      "image",
      dataset.map(({ image }) => image),
    ]);
    for await (const [{ filename, image }, prediction] of dataset.zip(
      toRaw(generator.value),
    )) {
      results = results.push({
        input: {
          filename,
          image: new ImageData(
            new Uint8ClampedArray(image.data),
            image.width,
            image.height,
          ),
        },
        output: labels.get(prediction) ?? prediction.toString(),
      });

      predictions.value = { type: "image", results };
    }
  } finally {
    generator.value = undefined;
  }
}

async function startTabularInference(dataset: Dataset<Tabular>): Promise<void> {
  const { inputColumns, outputColumns } = props.task.trainingInformation;
  if (inputColumns === undefined || outputColumns === undefined)
    throw new Error("no input and output columns but tabular task needs it");
  const labels = {
    input: List(inputColumns),
    output: List(outputColumns).map((c) => `Predicted_${c}`),
  };
  const validator = new Validator(props.task, toRaw(props.model));

  let results: (Results & { type: "tabular" })["results"] = List();
  try {
    generator.value = await validator.infer(["tabular", dataset]);
    for await (const [input, prediction] of dataset.zip(
      toRaw(generator.value),
    )) {
      results = results.push({
        input: labels.input.map((label) => {
          const ret = input[label];
          if (ret === undefined)
            throw new Error("row doesn't have expected label");
          return ret;
        }),
        output: prediction.toString(),
      });

      predictions.value = { type: "tabular", labels, results };
    }
  } finally {
    generator.value = undefined;
  }
}

async function stopInference(): Promise<void> {
  const g = generator.value;
  if (g === undefined) return;

  generator.value = undefined;
  g.return();
}

function saveCsv() {
  if (predictions.value === undefined)
    throw new Error("asked to save CSV without predictions results");

  const csvData = format(predictions.value);
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const downloadLink = document.createElement("a");
  downloadLink.setAttribute("href", URL.createObjectURL(blob));
  downloadLink.setAttribute(
    "download",
    `predictions_${props.task.id}_${Date.now()}.csv`,
  );
  downloadLink.click();

  function format(predictions: Results): string {
    switch (predictions.type) {
      case "image": {
        return d3.csvFormatRows([
          ["Filename", "Prediction"],
          ...predictions.results.map(({ input, output }) => [
            input.filename,
            output,
          ]),
        ]);
      }
      case "tabular": {
        return d3.csvFormatRows([
          predictions.labels.input.concat(predictions.labels.output).toArray(),
          ...predictions.results.map(({ input, output }) =>
            input.push(output).toArray(),
          ),
        ]);
      }
    }
  }
}
</script>
