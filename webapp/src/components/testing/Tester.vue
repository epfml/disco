<template>
  <div>
    <div class="space-y-8">
      <!-- Test the model on a data set with labels -->
      <IconCard
        v-if="groundTruth"
        class="mx-auto mt-10 lg:w-1/2"
        title-placement="left"
      >
        <template #title> Test &amp; validate your model </template>

        <div v-if="testGenerator === undefined">
          By clicking the button below, you will be able to validate your model
          against a chosen dataset of yours. Below, once you assessed the model,
          you can compare the ground truth and the predicted values
          <div class="flex justify-center mt-4">
            <CustomButton @click="testModel()"> test </CustomButton>
          </div>
        </div>
        <div v-else>
          <div class="flex justify-center">
            <CustomButton @click="stopTest()"> stop testing </CustomButton>
          </div>
        </div>
      </IconCard>

      <!--Run inference using the model (no need for labels) -->
      <IconCard v-else class="mx-auto mt-10 lg:w-1/2" title-placement="left">
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
            <CustomButton @click="stopInference()">
              stop inference
            </CustomButton>
          </div>
        </div>
      </IconCard>

      <!-- display the evaluation metrics -->
      <div
        v-if="groundTruth"
        class="p-4 mx-auto lg:w-1/2 h-full bg-white rounded-md"
      >
        <!-- header -->
        <h4 class="p-4 border-b text-lg font-semibold text-slate-500">
          Test Accuracy
        </h4>
        <!-- stats -->
        <div class="grid grid-cols-2 p-4 font-medium text-slate-500">
          <div class="text-center">
            <span class="text-2xl">{{ currentAccuracy }}</span>
            <span class="text-sm">% of test accuracy</span>
          </div>
          <div class="text-center">
            <span class="text-2xl">{{ visitedSamples }}</span>
            <span class="text-sm">&nbsp;samples visited</span>
          </div>
        </div>
      </div>
      <div v-else class="p-4 mx-auto lg:w-1/2 h-full bg-white rounded-md">
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
              <p
                :class="
                  value.groundTruth && value.prediction !== value.groundTruth
                    ? 'text-red-700'
                    : 'text-green-500'
                "
              >
                Pred:
                <span class="font-bold">{{
                  getLabelName(value.prediction)
                }}</span>
              </p>
            </template>
            <template #subtitle>
              <p
                v-if="
                  value.groundTruth && value.groundTruth !== value.prediction
                "
                class="text-disco-blue"
              >
                Truth:
                <span class="font-bold">{{
                  getLabelName(value.groundTruth)
                }}</span>
              </p>
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
    <div
      v-if="validator?.confusionMatrix !== undefined"
      class="flex flex-col space-y-8"
    >
      <IconCard class="w-full lg:w-3/5 mx-auto">
        <template #title>
          Confusion Matrix ({{ numberOfClasses }}x{{ numberOfClasses }})
        </template>

        <table class="auto border-collapse w-full">
          <thead>
            <tr>
              <td />
              <td
                v-for="(_, i) in validator.confusionMatrix"
                :key="i"
                class="text-center text-disco-cyan text-lg font-normal p-3 border-l-2 border-disco-cyan"
              >
                {{
                  task.trainingInformation.LABEL_LIST === undefined
                    ? "undefined"
                    : task.trainingInformation.LABEL_LIST[i]
                }}
              </td>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in validator.confusionMatrix" :key="i">
              <th
                class="text-center text-disco-cyan text-lg font-normal border-t-2 border-disco-cyan"
              >
                {{
                  task.trainingInformation.LABEL_LIST === undefined
                    ? "undefined"
                    : task.trainingInformation.LABEL_LIST[i]
                }}
              </th>
              <td
                v-for="(predictions, j) in row"
                :key="j"
                class="text-center text-lg p-3 border-l-2 border-t-2 border-disco-cyan"
              >
                {{ predictions }}
              </td>
            </tr>
          </tbody>
        </table>
      </IconCard>

      <IconCard v-if="numberOfClasses === 2" class="w-full lg:w-3/5 mx-auto">
        <template #title> Evaluation Metrics </template>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 class="font-bold">Sensitivity</h3>
            <span>{{ validator.confusionMatrix[0] }}</span>
          </div>
          <div>
            <h3 class="font-bold">Specificity</h3>
            <span>{{ validator.confusionMatrix[1] }}</span>
          </div>
        </div>
      </IconCard>
    </div>
  </div>
</template>
<script lang="ts" setup>
import * as d3 from "d3";
import createDebug from "debug";
import { List } from "immutable";
import { storeToRefs } from "pinia";
import { computed, ref, toRaw } from "vue";

import type { Task, TypedDataset, TypedLabeledDataset } from "@epfml/discojs";
import { ConsoleLogger, EmptyMemory, Validator } from "@epfml/discojs";
import { IndexedDB } from "@epfml/discojs-web";

import { useMemoryStore } from "@/store/memory";
import { useValidationStore } from "@/store/validation";
import { useToaster } from "@/composables/toaster";

import IconCard from "@/components/containers/IconCard.vue";
import ImageCard from "@/components/containers/ImageCard.vue";
import TableLayout from "@/components/containers/TableLayout.vue";
import CustomButton from "@/components/simple/CustomButton.vue";

import type { TypedNamedLabeledDataset } from "@/components/dataset_input/types.js";

const debug = createDebug("webapp:Tester");
const { useIndexedDB } = storeToRefs(useMemoryStore());
const toaster = useToaster();
const validationStore = useValidationStore();

// TODO split into Tester and Predictor
//   avoid type mixing and ground truth prop (logic simplification)
//   allow users to upload images without labels

const props = defineProps<{
  task: Task;
  dataset?: TypedNamedLabeledDataset;
  groundTruth: boolean;
}>();

interface ImageWithUrl {
  filename: string;
  image: ImageData;
}

interface DataWithPrediction {
  data: ImageWithUrl | number[];
  prediction?: number;
  groundTruth?: number;
}

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
const numberOfClasses = computed(
  () => props.task.trainingInformation.LABEL_LIST?.length ?? 2,
);
const memory = computed(() =>
  useIndexedDB ? new IndexedDB() : new EmptyMemory(),
);

type InferenceResults = Array<{ features: number[]; pred: number }>;
const inferenceGenerator = ref<AsyncGenerator<InferenceResults, void>>();

type TestResults = Array<{
  groundTruth: number;
  pred: number;
  features: number[];
}>;
const testGenerator = ref<AsyncGenerator<TestResults, void>>();

const currentAccuracy = computed(() => {
  const r = validator.value?.accuracy;
  return r !== undefined ? (r * 100).toFixed(2) : "0";
});
const visitedSamples = computed(() => validator.value?.visitedSamples ?? 0);

function getLabelName(labelIndex: number | undefined): string {
  if (labelIndex === undefined) return "";
  const labelList = props.task.trainingInformation.LABEL_LIST;
  if (labelList !== undefined && labelList.length > labelIndex) {
    let label = labelList[labelIndex];
    if (label.length > 6) return label.slice(0, 6).concat("...");
    else return label;
  } else {
    return labelIndex.toString();
  }
}

function dropName(dataset: TypedNamedLabeledDataset): TypedLabeledDataset {
  switch (dataset[0]) {
    case "image":
      return ["image", dataset[1].map(({ image, label }) => [image, label])];
    default:
      return dataset;
  }
}
function dropNameAndLabel(dataset: TypedNamedLabeledDataset): TypedDataset {
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

  if (props.dataset === undefined) {
    toaster.error("Upload a dataset first");
    return;
  }
  const dataset = toRaw(props.dataset);

  toaster.info("Model inference started");
  try {
    const generator = await v.inference(dropNameAndLabel(dataset));
    inferenceGenerator.value = generator;

    let runningPredictions: InferenceResults = [];
    for await (const predictions of generator) {
      runningPredictions = runningPredictions.concat(predictions);
      switch (dataset[0]) {
        case "image":
          dataWithPred.value = await arrayFromAsync(
            dataset[1]
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

async function testModel(): Promise<void> {
  const v = validator.value;
  if (v === undefined) {
    toaster.error("No model found");
    return;
  }

  if (props.dataset === undefined) {
    toaster.error("Upload a dataset first");
    return;
  }
  const dataset = toRaw(props.dataset);

  toaster.info("Model testing started");
  try {
    const generator = v.test(dropName(dataset));
    testGenerator.value = generator;
    let runningResults: TestResults = [];
    for await (const assessmentResults of generator) {
      runningResults = runningResults.concat(assessmentResults);
      switch (dataset[0]) {
        case "image":
          dataWithPred.value = List(await arrayFromAsync(dataset[1]))
            .zip(List(runningResults))
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
              groundTruth: prediction.groundTruth,
            }))
            .toArray();
          break;
        case "tabular": {
          const { inputColumns, outputColumns } =
            props.task.trainingInformation;
          if (inputColumns === undefined || outputColumns === undefined)
            throw new Error("no input and output columns but CSV needs it");
          featuresNames.value = [
            ...inputColumns,
            ...outputColumns.map((c) => `Predicted_${c}`),
            ...outputColumns.map((c) => `Target_${c}`),
          ];
          dataWithPred.value = runningResults.map((pred) => ({
            data: [...pred.features, pred.pred, pred.groundTruth],
          }));
          break;
        }
        case "text":
          // TODO nothing to show for now
          dataWithPred.value = []
      }
    }

    toaster.success("Model testing finished successfully!");
  } catch (e) {
    debug("while testing: %o", e);
    toaster.error("Something went wrong during model testing");
  } finally {
    testGenerator.value = undefined;
  }
}

async function stopTest(): Promise<void> {
  const generator = testGenerator.value;
  if (generator === undefined) return;

  generator.return();
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
  if (props.dataset === undefined) {
    toaster.error("Upload a dataset first");
    return;
  }
  const dataset = toRaw(props.dataset);

  const csvData = format(dataset[0], dataWithPred.value);
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
        if (props.groundTruth) {
          const rows = dataWithPred.map((el) => [
            (el.data as ImageWithUrl).filename,
            String(el.prediction),
            String(el.groundTruth),
          ]);
          return d3.csvFormatRows([
            ["Filename", "Prediction", "Ground Truth"],
            ...rows,
          ]);
        } else {
          const rows = dataWithPred.map((el) => [
            (el.data as ImageWithUrl).filename,
            String(el.prediction),
          ]);
          return d3.csvFormatRows([["Filename", "Prediction"], ...rows]);
        }
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
