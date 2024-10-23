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
    v-show="validationStore.step === 1"
    class="flex flex-col space-y-4 md:space-y-8"
  >
    <UnlabeledDatasetInput :task="task" v-model="dataset">
      <template #header> <DataDescription :task /> </template>
    </UnlabeledDatasetInput>
  </div>

  <div v-show="validationStore.step === 2" class="space-y-8">
    <IconCard class="mx-auto mt-10 lg:w-1/2" title-placement="left">
      <template #title> Run model inference </template>

      <div v-show="generator === undefined">
        By clicking the button below, you will be able to predict using the
        selected model with chosen dataset of yours.

        <div class="flex justify-center mt-4">
          <CustomButton @click="startInference()"> predict </CustomButton>
        </div>
      </div>
      <div v-show="generator !== undefined">
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
          <span class="text-2xl"> {{ visitedSamples }} </span>
          <span class="text-sm">&nbsp;samples visited</span>
        </div>
      </div>
    </div>

    <div v-if="predictions !== undefined">
      <div class="mx-auto lg:w-1/2 text-center pb-8">
        <CustomButton @click="saveCsv()"> download as csv </CustomButton>
      </div>

      <!-- Image gallery -->
      <div
        v-if="task.trainingInformation.dataType === 'image'"
        class="grid grid-cols-6 gap-6"
      >
        <ImageCard
          v-for="(result, index) in predictions as Results['image']"
          :key="index"
          :image="result.input.image"
        >
          <template #title>
            <span class="font-bold">{{ result.output }}</span>
          </template>
        </ImageCard>
      </div>

      <div
        v-else-if="task.trainingInformation.dataType === 'tabular'"
        class="mx-auto lg:w-3/4 h-full bg-white dark:bg-slate-950 rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
      >
        <TableLayout
          :columns="
            (predictions as Results['tabular']).labels.input.concat(
              (predictions as Results['tabular']).labels.output,
            )
          "
          :rows="
            (predictions as Results['tabular']).results.map(
              ({ input, output }) => input.push(output),
            )
          "
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup generic="D extends DataType">
import * as d3 from "d3";
import createDebug from "debug";
import { List } from "immutable";
import { computed, ref, toRaw } from "vue";

import type { DataFormat, DataType, Model, Task } from "@epfml/discojs";
import { Validator } from "@epfml/discojs";

import InfoIcon from "@/assets/svg/InfoIcon.vue";
import { useToaster } from "@/composables/toaster";
import { useValidationStore } from "@/store/validation";

import DataDescription from "@/components/dataset_input/DataDescription.vue";
import IconCard from "@/components/containers/IconCard.vue";
import ImageCard from "@/components/containers/ImageCard.vue";
import TableLayout from "@/components/containers/TableLayout.vue";
import CustomButton from "@/components/simple/CustomButton.vue";
import UnlabeledDatasetInput from "@/components/dataset_input/UnlabeledDatasetInput.vue";
import type { UnlabeledDataset } from "@/components/dataset_input/types.js";

const debug = createDebug("webapp:testing:PredictSteps");
const toaster = useToaster();
const validationStore = useValidationStore();

const props = defineProps<{
  task: Task<D>;
  model: Model<D>;
}>();

interface Results {
  image: List<{
    input: { filename: string; image: ImageData };
    output: string;
  }>;
  tabular: {
    labels: { input: List<string>; output: string };
    results: List<{ input: List<string>; output: string }>;
  };
  text: never;
}

const dataset = ref<UnlabeledDataset[D]>();
const generator = ref<AsyncGenerator<DataFormat.Inferred[D], void>>();
const predictions = ref<Results[D]>();

const visitedSamples = computed<number>(() => {
  if (predictions.value === undefined) return 0;

  switch (props.task.trainingInformation.dataType) {
    case "image":
      return (predictions.value as Results["image"]).size;
    case "tabular":
      return (predictions.value as Results["tabular"]).results.size;
    case "text":
      throw new Error("disabled dataset type");
    default: {
      const _: never = props.task.trainingInformation;
      throw new Error("should never happen");
    }
  }
});

async function startInference(): Promise<void> {
  if (dataset.value === undefined) {
    toaster.error("Upload a dataset first");
    return;
  }

  toaster.info("Model inference started");
  try {
    switch (props.task.trainingInformation.dataType) {
      case "image":
        await startImageInference(
          props.task as Task<"image">,
          toRaw(props.model) as Model<"image">,
          toRaw(dataset.value) as UnlabeledDataset["image"],
        );
        break;
      case "tabular":
        await startTabularInference(
          props.task as Task<"tabular">,
          toRaw(props.model) as Model<"tabular">,
          toRaw(dataset.value) as UnlabeledDataset["tabular"],
        );
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

async function startImageInference(
  task: Task<"image">,
  model: Model<"image">,
  dataset: UnlabeledDataset["image"],
): Promise<void> {
  const validator = new Validator(task, model);

  let results: Results["image"] = List();
  try {
    const gen = validator.infer(dataset.map(({ image }) => image));
    generator.value = gen as AsyncGenerator<DataFormat.Inferred[D], void>;
    for await (const [{ filename, image }, output] of dataset.zip(toRaw(gen))) {
      results = results.push({
        input: {
          filename,
          image: new ImageData(
            new Uint8ClampedArray(image.data),
            image.width,
            image.height,
          ),
        },
        output,
      });

      predictions.value = results as Results[D];
    }
  } finally {
    generator.value = undefined;
  }
}

async function startTabularInference(
  task: Task<"tabular">,
  model: Model<"tabular">,
  dataset: UnlabeledDataset["tabular"],
): Promise<void> {
  const labels = {
    input: List(task.trainingInformation.inputColumns),
    output: `Predicted_${task.trainingInformation.outputColumn}`,
  };
  const validator = new Validator(task, model);

  let results: Results["tabular"]["results"] = List();
  try {
    const gen = validator.infer(dataset);
    generator.value = gen as AsyncGenerator<DataFormat.Inferred[D], void>;
    for await (const [input, prediction] of dataset.zip(toRaw(gen))) {
      results = results.push({
        input: labels.input.map((label) => {
          const ret = input[label];
          if (ret === undefined)
            throw new Error("row doesn't have expected label");
          return ret;
        }),
        output: prediction.toString(),
      });

      predictions.value = { labels, results } as Results[D];
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

  function format(predictions: Results[D]): string {
    switch (props.task.trainingInformation.dataType) {
      case "image":
        return d3.csvFormatRows([
          ["Filename", "Prediction"],
          ...(predictions as Results["image"]).map(({ input, output }) => [
            input.filename,
            output,
          ]),
        ]);
      case "tabular": {
        const preds = predictions as Results["tabular"];
        return d3.csvFormatRows([
          preds.labels.input.concat(preds.labels.output).toArray(),
          ...preds.results.map(({ input, output }) =>
            input.push(output).toArray(),
          ),
        ]);
      }
      case "text":
        throw new Error("disabled dataset type");
    }
  }
}
</script>
