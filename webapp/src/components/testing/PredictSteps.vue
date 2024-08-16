<template>
  <!-- Language model prompting is currently unavailable   -->
  <div
    v-if="task.trainingInformation.dataType === 'text'"
    v-show="validationStore.step !== 0"
  >
    <div class="flex justify-center items-center mb-4">
      <span
        class="shrink-0 py-4 px-4 bg-purple-100 rounded-md flex flex-row gap-x-4 items-center"
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
    />
  </div>

  <div v-if="validationStore.step === 2" class="space-y-8">
    <IconCard class="mx-auto mt-10 lg:w-1/2" title-placement="left">
      <template #title> Run model inference </template>

      <div v-if="inferenceGenerator === undefined">
        By clicking the button below, you will be able to predict using the
        selected model with chosen dataset of yours.

        <div class="flex justify-center mt-4">
          <CustomButton @click="modelInference()"> predict </CustomButton>
        </div>
      </div>
      <div v-else>
        <div class="flex justify-center">
          <CustomButton @click="stopInference()"> stop inference </CustomButton>
        </div>
      </div>
    </IconCard>

    <div class="p-4 mx-auto lg:w-1/2 h-full bg-white rounded-md">
      <!-- header -->
      <h4 class="p-4 border-b text-lg font-semibold text-slate-500">
        Inference metrics
      </h4>
      <!-- stats -->
      <div class="flex justify-center p-4 font-medium text-slate-500">
        <div class="text-center">
          <span class="text-2xl">{{ visitedSamples }}</span>
          <span class="text-sm">&nbsp;samples visited</span>
        </div>
      </div>
    </div>

    <div v-if="dataWithPred !== undefined">
      <div class="mx-auto lg:w-1/2 text-center pb-8">
        <CustomButton @click="saveCsv()"> download as csv </CustomButton>
        <a ref="downloadLink" class="hidden" />
      </div>

      <!-- Image prediction gallery -->
      <div v-if="dataset?.[0] === 'image'" class="grid grid-cols-6 gap-6">
        <ImageCard
          v-for="(value, key) in dataWithPred"
          :key="key"
          :image="(value.data as ImageWithUrl).image"
        >
          <template #title>
            <span class="font-bold">{{ getLabelName(value.prediction) }}</span>
          </template>
        </ImageCard>
      </div>

      <div
        v-else-if="props.task.trainingInformation.dataType === 'tabular'"
        class="mx-auto lg:w-3/4 h-full bg-white rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
      >
        <TableLayout
          :columns="featuresNames"
          :rows="dataWithPred.map((pred) => pred.data)"
        />
      </div>

      <div
        v-else-if="props.task.trainingInformation.dataType === 'text'"
        class="mx-auto lg:w-3/4 h-full bg-white rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
      >
        <!-- Display nothing for now -->
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import * as d3 from "d3";
import createDebug from "debug";
import { Set } from "immutable";
import { storeToRefs } from "pinia";
import { computed, ref, toRaw } from "vue";

import type {
  Dataset,
  Tabular,
  Task,
  Text,
  TypedDataset,
} from "@epfml/discojs";
import { ConsoleLogger, EmptyMemory, Validator } from "@epfml/discojs";
import { IndexedDB } from "@epfml/discojs-web";

import InfoIcon from "@/assets/svg/InfoIcon.vue";
import { useMemoryStore } from "@/store/memory";
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

const debug = createDebug("webapp:Tester");
const { useIndexedDB } = storeToRefs(useMemoryStore());
const toaster = useToaster();
const validationStore = useValidationStore();

const props = defineProps<{
  task: Task;
}>();

interface ImageWithUrl {
  filename: string;
  image: ImageData;
}

interface DataWithPrediction {
  data: ImageWithUrl | number[];
  prediction?: number;
}

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

const featuresNames = ref<string[]>([]);
const dataWithPred = ref<DataWithPrediction[]>();
const downloadLink = ref<HTMLAnchorElement>();

const validator = computed(() => {
  if (validationStore.model === undefined) return undefined;

  return new Validator(
    props.task,
    new ConsoleLogger(),
    memory.value,
    validationStore.model,
  );
});
const memory = computed(() =>
  useIndexedDB ? new IndexedDB() : new EmptyMemory(),
);

type InferenceResults = Array<{ features: number[]; pred: number }>;
const inferenceGenerator = ref<AsyncGenerator<InferenceResults, void>>();

const visitedSamples = computed(() => validator.value?.visitedSamples ?? 0);

function getLabelName(labelIndex: number | undefined): string {
  if (labelIndex === undefined) return "";

  const labelList = props.task.trainingInformation.LABEL_LIST;
  if (labelList !== undefined && labelList.length > labelIndex)
    return labelList[labelIndex];

  return labelIndex.toString();
}

function dropName(dataset: TypedNamedDataset): TypedDataset {
  switch (dataset[0]) {
    case "image":
      return ["image", dataset[1].map(({ image }) => image)];
    default:
      return dataset;
  }
}

async function modelInference(): Promise<void> {
  const v = validator.value;
  if (v === undefined) {
    toaster.error("No model found");
    return;
  }

  if (dataset.value === undefined) {
    toaster.error("Upload a dataset first");
    return;
  }

  toaster.info("Model inference started");
  try {
    const generator = await v.inference(dropName(toRaw(dataset.value)));
    inferenceGenerator.value = generator;

    let runningPredictions: InferenceResults = [];
    for await (const predictions of generator) {
      runningPredictions = runningPredictions.concat(predictions);
      switch (dataset.value[0]) {
        case "image":
          dataWithPred.value = await arrayFromAsync(
            toRaw(dataset.value[1])
              .zip(runningPredictions)
              .map(([{ filename, image }, prediction]) => ({
                data: {
                  filename,
                  image: new ImageData(
                    new Uint8ClampedArray(image.data),
                    image.width,
                    image.height,
                  ),
                },
                prediction: prediction.pred,
              })),
          );
          break;
        case "tabular": {
          const { inputColumns, outputColumns } =
            props.task.trainingInformation;
          if (inputColumns === undefined || outputColumns === undefined)
            throw new Error("no input and output columns but CSV needs it");
          featuresNames.value = [
            ...inputColumns,
            ...outputColumns.map((c) => `Predicted_${c}`),
          ];
          dataWithPred.value = runningPredictions.map((pred) => ({
            data: [...pred.features, pred.pred],
          }));
          break;
        }
        case "text":
          throw new Error("TODO implement");
      }
    }
    toaster.success("Model inference finished successfully!");
  } catch (e) {
    debug("while infering: %o", e);
    toaster.error("Something went wrong during model inference");
  } finally {
    inferenceGenerator.value = undefined;
  }
}

async function stopInference(): Promise<void> {
  const generator = inferenceGenerator.value;
  if (generator === undefined) return;

  generator.return();
}

function saveCsv() {
  if (downloadLink.value === undefined)
    throw new Error("asked to download CSV but page yet rendered");
  if (dataWithPred.value === undefined)
    throw new Error("asked to save CSV without having training results");
  if (dataset.value === undefined) {
    toaster.error("Upload a dataset first");
    return;
  }

  const csvData = format(dataset.value[0], dataWithPred.value);
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  downloadLink.value.setAttribute("href", URL.createObjectURL(blob));
  downloadLink.value.setAttribute(
    "download",
    `predictions_${props.task.id}_${Date.now()}.csv`,
  );
  downloadLink.value.click();

  function format(
    datasetType: TypedDataset[0],
    dataWithPred: DataWithPrediction[],
  ): string {
    switch (datasetType) {
      case "image": {
        const rows = dataWithPred.map((el) => [
          (el.data as ImageWithUrl).filename,
          String(el.prediction),
        ]);
        return d3.csvFormatRows([["Filename", "Prediction"], ...rows]);
      }
      case "tabular": {
        const featureNames = Object.values(featuresNames.value) as string[];
        const predictionsWithLabels = dataWithPred.map((el) =>
          Object.values(el.data).map(String),
        );
        return d3.csvFormatRows([featureNames, ...predictionsWithLabels]);
      }
      case "text":
        throw new Error("TODO implement formatter");
    }
  }
}

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}
</script>
