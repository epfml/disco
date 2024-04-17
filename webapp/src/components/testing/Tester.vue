<template>
  <div>
    <div class="space-y-8">
      <!-- assess the model -->
      <ButtonCard
        v-if="groundTruth"
        class="mx-auto mt-10 lg:w-1/2"
        :button-placement="'center'"
        @action="assessModel()"
      >
        <template #title> Test & validate your model </template>
        <template #text>
          By clicking the button below, you will be able to validate your model
          against a chosen dataset of yours. Below, once you assessed the model,
          you can compare the ground truth and the predicted values
        </template>
        <template #button> test </template>
      </ButtonCard>
      <!--only predict using the model -->
      <ButtonCard
        v-else
        class="mx-auto mt-10 lg:w-1/2"
        :button-placement="'center'"
        @action="predictUsingModel()"
      >
        <template #title> Predict using model </template>
        <template #text>
          By clicking the button below, you will be able to predict using the
          selected model with chosen dataset of yours.
        </template>
        <template #button> predict </template>
      </ButtonCard>

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

      <div v-if="dataWithPred !== undefined">
        <div class="mx-auto lg:w-1/2 text-center pb-8">
          <CustomButton @click="saveCsv()"> download as csv </CustomButton>
          <a ref="downloadLink" class="hidden" />
        </div>
        <!-- Image prediction gallery -->
        <div v-if="dataset[0] === 'image'" class="grid grid-cols-6 gap-6">
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
          v-else
          class="mx-auto lg:w-3/4 h-full bg-white rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
        >
          <TableLayout
            :columns="featuresNames"
            :rows="dataWithPred.map((pred) => pred.data)"
          />
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
        <template #content>
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
        </template>
      </IconCard>
      <IconCard v-if="numberOfClasses === 2" class="w-full lg:w-3/5 mx-auto">
        <template #title> Evaluation Metrics </template>
        <template #content>
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
        </template>
      </IconCard>
    </div>
  </div>
</template>
<script lang="ts" setup>
import * as d3 from "d3";
import { List } from "immutable";
import { storeToRefs } from "pinia";
import { computed, ref, toRaw } from "vue";

import type { Image, Task, TypedDataset } from "@epfml/discojs";
import { ConsoleLogger, EmptyMemory, Memory, Validator } from "@epfml/discojs";
import { IndexedDB } from "@epfml/discojs-web";

import { useMemoryStore } from "@/store/memory";
import { useValidationStore } from "@/store/validation";
import { useToaster } from "@/composables/toaster";
import type { TypedNamedDataset } from "@/components/data/Data.vue";

const { useIndexedDB } = storeToRefs(useMemoryStore());
const toaster = useToaster();
const validationStore = useValidationStore();

const props = defineProps<{
  task: Task;
  dataset: TypedNamedDataset;
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

const featuresNames = ref<String[]>([]);
const dataWithPred = ref<DataWithPrediction[]>();

const validator = computed(() => {
  if (validationStore.model === undefined) return undefined;
  return new Validator(
    props.task,
    new ConsoleLogger(),
    memory.value,
    validationStore.model,
  );
});

const numberOfClasses = computed<number>(
  () => props.task.trainingInformation.LABEL_LIST?.length ?? 2,
);

function getLabelName(labelIndex: number | undefined): string {
  if (labelIndex === undefined) {
    return "";
  }
  const labelList = props.task.trainingInformation.LABEL_LIST;
  if (labelList !== undefined && labelList.length > labelIndex) {
    let label = labelList[labelIndex];
    if (label.length > 6) {
      return label.slice(0, 6).concat("...");
    } else {
      return label;
    }
  } else {
    return labelIndex.toString();
  }
}

const memory = computed<Memory>(() =>
  useIndexedDB ? new IndexedDB() : new EmptyMemory(),
);

const currentAccuracy = computed(() => {
  const r = validator.value?.accuracy;
  return r !== undefined ? (r * 100).toFixed(2) : "0";
});
const visitedSamples = computed(() => validator.value?.visitedSamples ?? 0);

const downloadLink = ref<HTMLAnchorElement>();

function dropName([t, namedDataset]: TypedNamedDataset): TypedDataset {
  switch (t) {
    case "image":
      return [
        "image",
        namedDataset.map<[Image, string]>(({ image, label }) => [image, label]),
      ];
    case "tabular":
      return ["tabular", namedDataset];
    case "text":
      return ["text", namedDataset];
  }
}

async function predictUsingModel(): Promise<void> {
  const v = validator.value;
  if (v === undefined) {
    toaster.error("No model found");
    return;
  }

  toaster.info("Model prediction started");
  const predictions = await v.predict(toRaw(dropName(props.dataset)));

  switch (props.dataset[0]) {
    case "image": {
      dataWithPred.value = List(await arrayFromAsync(props.dataset[1]))
        .zip(List(predictions))
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
        }))
        .toArray();
      break;
    }
    case "tabular": {
      if (props.task.trainingInformation.inputColumns === undefined) {
        throw new Error("no input columns but CSV needs it");
      }
      featuresNames.value = [
        ...props.task.trainingInformation.inputColumns,
        "Predicted_" + props.task.trainingInformation.outputColumn,
      ];
      dataWithPred.value = predictions.map((pred) => ({
        data: [...(pred.features as number[]), pred.pred],
      }));
      break;
    }
    case "text":
      throw new Error("TODO implement");
  }

  toaster.success("Model prediction finished successfully!");
}

async function assessModel(): Promise<void> {
  const v = validator.value;
  if (v === undefined) {
    toaster.error("No model found");
    return;
  }

  toaster.info("Model testing started");
  try {
    const assessmentResults = await v.assess(toRaw(dropName(props.dataset)));

    if (props.dataset[0] === "image") {
      dataWithPred.value = List(await arrayFromAsync(props.dataset[1]))
        .zip(List(assessmentResults))
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
    } else {
      if (props.task.trainingInformation.inputColumns === undefined) {
        throw new Error("no input columns but CSV needs it");
      }
      featuresNames.value = [
        ...props.task.trainingInformation.inputColumns,
        "Predicted_" + props.task.trainingInformation.outputColumn,
        "Target_" + props.task.trainingInformation.outputColumn,
      ];
      dataWithPred.value = assessmentResults.map((pred) => ({
        data: [...(pred.features as number[]), pred.pred, pred.groundTruth],
      }));
    }
    toaster.success("Model testing finished successfully!");
  } catch (e) {
    let msg = "unable to assess model";
    if (e instanceof Error) {
      msg += `: ${e.message}`;
    }
    toaster.error(msg);
  }
}

function saveCsv() {
  if (downloadLink.value === undefined) {
    throw new Error("asked to download CSV but page yet rendered");
  }

  if (dataWithPred.value === undefined) {
    throw new Error("asked to save CSV without having training results");
  }

  let csvData: string;
  if (props.dataset[0] === "image") {
    if (props.groundTruth) {
      const rows = dataWithPred.value.map((el) => [
        (el.data as ImageWithUrl).filename,
        String(el.prediction),
        String(el.groundTruth),
      ]);
      csvData = d3.csvFormatRows([
        ["Filename", "Prediction", "Ground Truth"],
        ...rows,
      ]);
    } else {
      const rows = dataWithPred.value.map((el) => [
        (el.data as ImageWithUrl).filename,
        String(el.prediction),
      ]);
      csvData = d3.csvFormatRows([["Filename", "Prediction"], ...rows]);
    }
  } else {
    const featureNames = Object.values(featuresNames.value) as string[];
    const predictionsWithLabels = dataWithPred.value.map((el) =>
      Object.values(el.data).map(String),
    );
    csvData = d3.csvFormatRows([featureNames, ...predictionsWithLabels]);
  }

  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  downloadLink.value.setAttribute("href", URL.createObjectURL(blob));
  downloadLink.value.setAttribute(
    "download",
    `predictions_${props.task.id}_${Date.now()}.csv`,
  );
  downloadLink.value.click();
}

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}
</script>
