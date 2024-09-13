<template>
  <div
    v-show="validationStore.step === 1"
    class="flex flex-col space-y-4 md:space-y-8"
  >
    <LabeledDatasetInput :task v-model="dataset">
      <template #header>
        <IconCard>
          <template #title> Model Validation </template>

          It is very important that your model is tested against
          <b class="uppercase">unseen data</b>. As such, please ensure your
          dataset of choice was not used during the training phase of your
          model.
        </IconCard>

        <DataDescription :task />
      </template>
    </LabeledDatasetInput>
  </div>

  <div v-show="validationStore.step === 2" class="space-y-8">
    <!-- Test the model on a data set with labels -->
    <IconCard class="mx-auto mt-10 lg:w-1/2" title-placement="left">
      <template #title> Test &amp; validate your model </template>

      <div v-show="generator === undefined">
        By clicking the button below, you will be able to validate your model
        against a chosen dataset of yours. Below, once you assessed the model,
        you can compare the ground truth and the predicted values
        <div class="flex justify-center mt-4">
          <CustomButton @click="startTest()"> test </CustomButton>
        </div>
      </div>
      <div v-show="generator !== undefined">
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
      <div
        v-if="task.trainingInformation.dataType === 'image'"
        class="grid grid-cols-6 gap-6"
      >
        <ImageCard
          v-for="(result, key) in tested as Tested['image']"
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
        v-else-if="task.trainingInformation.dataType === 'tabular'"
        class="mx-auto lg:w-3/4 h-full bg-white dark:text-slate-950 rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
      >
        <TableLayout
          :columns="
            (tested as Tested['tabular']).labels.input
              .concat((tested as Tested['tabular']).labels.output.truth)
              .push((tested as Tested['tabular']).labels.output.correct)
          "
          :rows="
            (tested as Tested['tabular']).results.map(({ input, output }) =>
              input.concat(output.truth).push(output.correct.toString()),
            )
          "
        />
      </div>
      <div
        v-else-if="task.trainingInformation.dataType === 'text'"
        class="mx-auto lg:w-3/4 h-full bg-white dark:text-slate-950 rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
      >
        <!-- Display nothing for now -->
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup generic="D extends DataType">
import * as d3 from "d3";
import createDebug from "debug";
import { List } from "immutable";
import { computed, ref, toRaw } from "vue";

import type { DataType, Image, Model, Task } from "@epfml/discojs";
import { Validator } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster";
import { useValidationStore } from "@/store/validation";

import CustomButton from "@/components/simple/CustomButton.vue";
import DataDescription from "@/components/dataset_input/DataDescription.vue";
import IconCard from "@/components/containers/IconCard.vue";
import ImageCard from "@/components/containers/ImageCard.vue";
import LabeledDatasetInput from "@/components/dataset_input/LabeledDatasetInput.vue";
import TableLayout from "@/components/containers/TableLayout.vue";
import type { LabeledDataset } from "@/components/dataset_input/types.js";

const debug = createDebug("webapp:testing:TestSteps");
const toaster = useToaster();
const validationStore = useValidationStore();

const props = defineProps<{
  task: Task;
  model: Model;
}>();

interface Tested {
  image: List<{
    input: { filename: string; image: ImageData };
    output: { truth: string; correct: boolean };
  }>;
  tabular: {
    labels: {
      input: List<string>;
      output: { truth: string; correct: string };
    };
    results: List<{
      input: List<string>;
      output: { truth: string; correct: boolean };
    }>;
  };
  // TODO what to show?
  text: List<{ output: { correct: boolean } }>;
}

const dataset = ref<LabeledDataset[D]>();
const generator = ref<AsyncGenerator<boolean, void>>();
const tested = ref<Tested[D]>();

const visitedSamples = computed<number>(() => {
  if (tested.value === undefined) return 0;

  switch (props.task.trainingInformation.dataType) {
    case "image":
    case "text":
      return (tested.value as Tested["image" | "text"]).size;
    case "tabular":
      return (tested.value as Tested["tabular"]).results.size;
    default: {
      const _: never = props.task.trainingInformation;
      throw new Error("should never happen");
    }
  }
});
const currentAccuracy = computed<string>(() => {
  if (tested.value === undefined) return "0";

  let hits: number | undefined;
  switch (props.task.trainingInformation.dataType) {
    case "image":
    case "text":
      hits = (tested.value as Tested["image" | "text"]).filter(
        ({ output }) => output.correct,
      ).size;
      break;
    case "tabular":
      hits = (tested.value as Tested["tabular"]).results.filter(
        ({ output }) => output.correct,
      ).size;
      break;
  }
  const accuracy = hits / visitedSamples.value;

  return (accuracy * 100).toFixed(2);
});

async function startTest(): Promise<void> {
  if (dataset.value === undefined) {
    toaster.error("Upload a dataset first");
    return;
  }

  toaster.info("Model testing started");
  try {
    switch (props.task.trainingInformation.dataType) {
      case "image":
        await startImageTest(
          props.task as Task<"image">,
          toRaw(props.model) as Model<"image">,
          toRaw(dataset.value) as LabeledDataset["image"],
        );
        break;
      case "tabular":
        await startTabularTest(
          props.task as Task<"tabular">,
          toRaw(props.model) as Model<"tabular">,
          toRaw(dataset.value) as LabeledDataset["tabular"],
        );
        break;
      case "text":
        startTextTest(
          props.task as Task<"text">,
          toRaw(props.model) as Model<"text">,
          toRaw(dataset.value) as LabeledDataset["text"],
        );
        break;
    }

    toaster.success("Model testing finished successfully!");
  } catch (e) {
    debug("while testing: %o", e);
    toaster.error("Something went wrong during model testing");
  }
}

async function startImageTest(
  task: Task<"image">,
  model: Model<"image">,
  dataset: LabeledDataset["image"],
): Promise<void> {
  const validator = new Validator(task, model);
  let results: Tested["image"] = List();

  try {
    generator.value = validator.test(
      dataset.map(({ image, label }) => [image, label] as [Image, string]),
    );
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

      tested.value = results as Tested[D];
    }
  } finally {
    generator.value = undefined;
  }
}

async function startTabularTest(
  task: Task<"tabular">,
  model: Model<"tabular">,
  dataset: LabeledDataset["tabular"],
): Promise<void> {
  const { inputColumns, outputColumn } = task.trainingInformation;
  if (inputColumns === undefined || outputColumn === undefined)
    throw new Error("no input and output columns but CSV needs it");
  const labels = {
    input: List(inputColumns),
    output: {
      truth: `Truth_${outputColumn}`,
      correct: "Correct",
    },
  };
  const validator = new Validator(task, model);

  let results: Tested["tabular"]["results"] = List();
  try {
    generator.value = validator.test(dataset);
    for await (const [row, correct] of dataset.zip(toRaw(generator.value))) {
      const truth = row[outputColumn];
      if (truth === undefined)
        throw new Error("row doesn't have expected output column");

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

      tested.value = { labels, results } as Tested[D];
    }
  } finally {
    generator.value = undefined;
  }
}

async function startTextTest(
  task: Task<"text">,
  model: Model<"text">,
  dataset: LabeledDataset["text"],
): Promise<void> {
  const validator = new Validator(task, model);
  let results: Tested["text"] = List();

  try {
    generator.value = validator.test(dataset);
    for await (const correct of toRaw(generator.value)) {
      results = results.push({ output: { correct } });
      tested.value = results as Tested[D];
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

  function format(tested: Tested[D]): string {
    switch (props.task.trainingInformation.dataType) {
      case "image":
        return d3.csvFormatRows([
          ["Filename", "Truth", "Correct"],
          ...(tested as Tested["image"]).map(({ input, output }) => [
            input.filename,
            output.truth,
            output.correct.toString(),
          ]),
        ]);
      case "tabular": {
        const t = tested as Tested["tabular"];
        return d3.csvFormatRows([
          t.labels.input
            .concat(t.labels.output.truth)
            .push(t.labels.output.correct)
            .toArray(),
          ...t.results.map((result) =>
            result.input
              .concat(result.output.truth)
              .push(result.output.correct.toString())
              .toArray(),
          ),
        ]);
      }
      case "text":
        throw new Error("TODO implement formatter");
      default: {
        const _: never = props.task.trainingInformation;
        throw new Error("should never happen");
      }
    }
  }
}
</script>
