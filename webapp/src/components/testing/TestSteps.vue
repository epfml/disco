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
      :labels="imageLabels"
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

      <div v-if="generator === undefined">
        By clicking the button below, you will be able to validate your model
        against a chosen dataset of yours. Below, once you assessed the model,
        you can compare the ground truth and the predicted values
        <div class="flex justify-center mt-4">
          <CustomButton @click="startTest()"> test </CustomButton>
        </div>
      </div>
      <div v-else>
        <div class="flex justify-center">
          <CustomButton @click="stopTest()"> stop testing </CustomButton>
        </div>
      </div>
    </IconCard>

    <!-- display the evaluation metrics -->
    <div class="p-4 mx-auto lg:w-1/2 h-full bg-white dark:bg-slate-950 rounded-md">
      <!-- header -->
      <h4 class="p-4 border-b text-lg font-semibold text-slate-500 dark:text-slate-300">
        Test Accuracy
      </h4>
      <!-- stats -->
      <div class="grid grid-cols-2 p-4 font-medium text-slate-500 dark:text-slate-400">
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

    <div v-if="tested !== undefined">
      <div class="mx-auto lg:w-1/2 text-center pb-8">
        <CustomButton @click="saveCsv()"> download as csv </CustomButton>
      </div>

      <!-- Image gallery -->
      <div v-if="tested.type === 'image'" class="grid grid-cols-6 gap-6">
        <ImageCard
          v-for="(result, key) in tested.results"
          :key="key"
          :image="result.input.image"
        >
          <template #title>
            <p
              class="font-bold"
              :class="result.output.correct ? 'text-red-700' : 'text-green-500'"
            >
              {{ result.output.truth }}
            </p>
          </template>
        </ImageCard>
      </div>

      <div
        v-else-if="tested.type === 'tabular'"
        class="mx-auto lg:w-3/4 h-full bg-white dark:text-slate-950 rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
      >
        <TableLayout
          :columns="
            tested.labels.input
              .concat(tested.labels.output.truth)
              .push(tested.labels.output.correct)
          "
          :rows="
            tested.results.map(({ input, output }) =>
              input.concat(output.truth).push(output.correct.toString()),
            )
          "
        />
      </div>
      <div
        v-else-if="tested.type === 'text'"
        class="mx-auto lg:w-3/4 h-full bg-white dark:text-slate-950 rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
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
import { computed, ref, toRaw, watch } from "vue";

import type { Dataset, Model, Tabular, Task, Text } from "@epfml/discojs";
import { Validator } from "@epfml/discojs";

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

const debug = createDebug("webapp:testing:TestSteps");
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
        output: {
          truth: string;
          correct: boolean;
        };
      }>;
    }
  | {
      type: "tabular";
      labels: {
        input: List<string>;
        output: {
          truth: List<string>;
          correct: string;
        };
      };
      results: List<{
        input: List<string>;
        output: {
          truth: List<string>;
          correct: boolean;
        };
      }>;
    }
  | {
      type: "text";
      // TODO what to show?
      results: List<{ output: { correct: boolean } }>;
    };

const imageLabels = computed(() =>
  Set(props.task.trainingInformation.LABEL_LIST),
);
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

const tested = ref<Results>();
const visitedSamples = computed(() => tested.value?.results.size ?? 0);
const currentAccuracy = computed(() => {
  if (tested.value === undefined) return "0";

  let hits: number | undefined;
  switch (tested.value.type) {
    case "image":
      hits = tested.value.results.filter(({ output }) => output.correct).size;
      break;
    case "tabular":
      hits = tested.value.results.filter(({ output }) => output.correct).size;
      break;
    case "text":
      hits = tested.value.results.filter(({ output }) => output.correct).size;
      break;
  }
  const accuracy = hits / tested.value.results.size;

  return (accuracy * 100).toFixed(2);
});

const generator = ref<AsyncGenerator<boolean, void>>();

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

async function startTest(): Promise<void> {
  if (dataset.value === undefined) {
    toaster.error("Upload a dataset first");
    return;
  }

  toaster.info("Model testing started");
  try {
    switch (dataset.value[0]) {
      case "image":
        await startImageTest(toRaw(dataset.value)[1]);
        break;
      case "tabular":
        await startTabularTest(toRaw(dataset.value)[1]);
        break;
      case "text":
        startTextTest(toRaw(dataset.value)[1]);
        break;
    }

    toaster.success("Model testing finished successfully!");
  } catch (e) {
    debug("while testing: %o", e);
    toaster.error("Something went wrong during model testing");
  }
}

async function startImageTest(
  dataset: NamedLabeledImageDataset,
): Promise<void> {
  const validator = new Validator(props.task, toRaw(props.model));
  let results: (Results & { type: "image" })["results"] = List();

  try {
    generator.value = validator.test([
      "image",
      dataset.map(({ image, label }) => [image, label]),
    ]);
    for await (const [{ filename, image, label }, correct] of dataset.zip(
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
        output: {
          truth: label,
          correct,
        },
      });

      tested.value = { type: "image", results };
    }
  } finally {
    generator.value = undefined;
  }
}

async function startTabularTest(dataset: Dataset<Tabular>): Promise<void> {
  const { inputColumns, outputColumns } = props.task.trainingInformation;
  if (inputColumns === undefined || outputColumns === undefined)
    throw new Error("no input and output columns but CSV needs it");
  const labels = {
    input: List(inputColumns),
    output: {
      truth: List(outputColumns).map((c) => `Truth_${c}`),
      correct: "Correct",
    },
  };
  const validator = new Validator(props.task, toRaw(props.model));

  let results: (Results & { type: "tabular" })["results"] = List();
  try {
    generator.value = validator.test(["tabular", dataset]);
    for await (const [row, correct] of dataset.zip(toRaw(generator.value))) {
      // TODO we only really support a single output, change Task to reflect that
      const truth = List(outputColumns).map((column) => {
        const ret = row[column];
        if (ret === undefined)
          throw new Error("row doesn't have expected output column");
        return ret;
      });

      results = results.push({
        input: labels.input.map((label) => {
          const ret = row[label];
          if (ret === undefined)
            throw new Error("row doesn't have expected label");
          return ret;
        }),
        output: {
          truth,
          correct,
        },
      });

      tested.value = { type: "tabular", labels, results };
    }
  } finally {
    generator.value = undefined;
  }
}

async function startTextTest(dataset: Dataset<Text>): Promise<void> {
  const validator = new Validator(props.task, toRaw(props.model));
  let results: (Results & { type: "text" })["results"] = List();

  try {
    generator.value = validator.test(["text", dataset]);
    for await (const correct of toRaw(generator.value)) {
      results = results.push({ output: { correct } });
      tested.value = { type: "text", results };
    }
  } finally {
    generator.value = undefined;
  }
}

async function stopTest(): Promise<void> {
  const g = generator.value;
  if (g === undefined) return;

  generator.value = undefined;
  g.return();
}

function saveCsv(): void {
  if (tested.value === undefined)
    throw new Error("asked to save CSV without testing results");

  const csvData = format(tested.value);
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const downloadLink = document.createElement("a");
  downloadLink.setAttribute("href", URL.createObjectURL(blob));
  downloadLink.setAttribute(
    "download",
    `tests_${props.task.id}_${Date.now()}.csv`,
  );
  downloadLink.click();

  function format(tested: Results): string {
    switch (tested.type) {
      case "image":
        return d3.csvFormatRows([
          ["Filename", "Truth", "Correct"],
          ...tested.results.map(({ input, output }) => [
            input.filename,
            output.truth,
            output.correct.toString(),
          ]),
        ]);
      case "tabular":
        return d3.csvFormatRows([
          tested.labels.input
            .concat(tested.labels.output.truth)
            .push(tested.labels.output.correct)
            .toArray(),
          ...tested.results.map((result) =>
            result.input
              .concat(result.output.truth)
              .push(result.output.correct.toString())
              .toArray(),
          ),
        ]);
    }

    throw new Error("TODO implement formatter");
  }
}
</script>
