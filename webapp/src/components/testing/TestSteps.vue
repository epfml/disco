<template>
  <div
    v-show="validationStore.step === 1"
    class="flex flex-col space-y-4 md:space-y-8"
  >
    <!-- Information specific to the validation panel -->
    <IconCard>
      <template #title> Model Validation </template>

      It is very important that your model is tested against
      <b class="uppercase">unseen data</b>. As such, please ensure your dataset
      of choice was not used during the training phase of your model.
    </IconCard>

    <DataDescription :task="task" />

    <LabeledImageDatasetInput
      v-if="task.trainingInformation.dataType === 'image'"
      v-model="imageDataset"
      :labels="labels"
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

  <div v-show="validationStore.step === 2" class="space-y-8">
    <!-- Test the model on a data set with labels -->
    <IconCard class="mx-auto mt-10 lg:w-1/2" title-placement="left">
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

    <!-- display the evaluation metrics -->
    <div class="p-4 mx-auto lg:w-1/2 h-full bg-white rounded-md">
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
              class="font-bold"
              :class="
                value.prediction !== value.groundTruth
                  ? 'text-red-700'
                  : 'text-green-500'
              "
            >
              {{ getLabelName(value.prediction) }}
            </p>
          </template>
          <template #subtitle>
            <p
              v-if="value.groundTruth !== value.prediction"
              class="text-disco-blue"
            >
              <span class="font-bold">{{
                getLabelName(value.groundTruth)
              }}</span>
            </p>
          </template>
        </ImageCard>
      </div>
      <div
        v-else-if="task.trainingInformation.dataType === 'tabular'"
        class="mx-auto lg:w-3/4 h-full bg-white rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
      >
        <TableLayout
          :columns="featuresNames"
          :rows="dataWithPred.map((pred) => pred.data)"
        />
      </div>
      <div
        v-else-if="task.trainingInformation.dataType === 'text'"
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
import { List, Range, Set } from "immutable";
import { storeToRefs } from "pinia";
import { computed, ref, toRaw, watch } from "vue";

import type {
  Dataset,
  Tabular,
  Task,
  Text,
  TypedDataset,
  TypedLabeledDataset,
} from "@epfml/discojs";
import { ConsoleLogger, EmptyMemory, Validator } from "@epfml/discojs";
import { IndexedDB } from "@epfml/discojs-web";

import { useMemoryStore } from "@/store/memory";
import { useToaster } from "@/composables/toaster";
import { useValidationStore } from "@/store/validation";

import IconCard from "@/components/containers/IconCard.vue";
import ImageCard from "@/components/containers/ImageCard.vue";
import TableLayout from "@/components/containers/TableLayout.vue";
import DataDescription from "@/components/dataset_input/DataDescription.vue";
import LabeledImageDatasetInput from "@/components/dataset_input/LabeledImageDatasetInput/index.vue";
import TabularDatasetInput from "@/components/dataset_input/TabularDatasetInput.vue";
import TextDatasetInput from "@/components/dataset_input/TextDatasetInput.vue";
import CustomButton from "@/components/simple/CustomButton.vue";

import type {
  NamedLabeledImageDataset,
  TypedNamedLabeledDataset,
} from "@/components/dataset_input/types.js";

const debug = createDebug("webapp:Tester");
const { useIndexedDB } = storeToRefs(useMemoryStore());
const toaster = useToaster();
const validationStore = useValidationStore();

const props = defineProps<{
  task: Task;
  modelID: string;
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

const labels = computed(() => Set(props.task.trainingInformation.LABEL_LIST));
const imageDataset = ref<NamedLabeledImageDataset>();
const tabularDataset = ref<Dataset<Tabular>>();
const textDataset = ref<Dataset<Text>>();
const dataset = computed<TypedNamedLabeledDataset | undefined>(() => {
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

watch(tabularDataset, async (dataset) => {
  if (dataset === undefined) return;

  const { inputColumns, outputColumns } = props.task.trainingInformation;
  if (inputColumns === undefined || outputColumns === undefined)
    throw new Error("tabular task without input or output columns");
  const wantedColumns = Set(inputColumns).union(outputColumns);

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

const featuresNames = ref<string[]>([]);
const dataWithPred = ref<DataWithPrediction[]>();
const downloadLink = ref<HTMLAnchorElement>();

const validator = computed(() => {
  return new Validator(
    props.task,
    new ConsoleLogger(),
    memory.value,
    props.modelID,
  );
});
const memory = computed(() =>
  useIndexedDB ? new IndexedDB() : new EmptyMemory(),
);

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
  if (labelList !== undefined && labelList.length > labelIndex)
    return labelList[labelIndex];

  return labelIndex.toString();
}

function dropName(dataset: TypedNamedLabeledDataset): TypedLabeledDataset {
  switch (dataset[0]) {
    case "image":
      return ["image", dataset[1].map(({ image, label }) => [image, label])];
    default:
      return dataset;
  }
}

async function testModel(): Promise<void> {
  const v = validator.value;
  if (v === undefined) {
    toaster.error("No model found");
    return;
  }

  if (dataset.value === undefined) {
    toaster.error("Upload a dataset first");
    return;
  }

  toaster.info("Model testing started");
  try {
    const generator = v.test(dropName(toRaw(dataset.value)));
    testGenerator.value = generator;
    let runningResults: TestResults = [];
    for await (const assessmentResults of generator) {
      runningResults = runningResults.concat(assessmentResults);
      switch (dataset.value[0]) {
        case "image":
          dataWithPred.value = List(
            await arrayFromAsync(toRaw(dataset.value[1])),
          )
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
          dataWithPred.value = [];
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
          String(el.groundTruth),
        ]);
        return d3.csvFormatRows([
          ["Filename", "Prediction", "Ground Truth"],
          ...rows,
        ]);
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
