<template>
  <div
    v-show="validationStore.step === 1"
    class="flex flex-col space-y-4 md:space-y-8"
  >
    <LabeledDatasetInput v-model="dataset" :task>
      <template #header>
        <IconCard class="mx-auto w-full max-w-card">
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

  <div v-show="validationStore.step === 2">
    <!-- Test the model on a data set with labels -->
    <div class="space-y-8 mb-8 w-full lg:max-w-card mx-auto">
      <IconCard>
        <template #title>Validate your model</template>

        <div v-show="controller === undefined">
          By clicking the button below, you will be able to validate your model
          against a chosen dataset of yours. Below, once you assessed the model,
          you can compare the ground truth and the predicted values
          <div class="flex justify-center mt-4">
            <CustomButton @click="startTest()"> test </CustomButton>
          </div>
        </div>
        <div v-show="controller !== undefined">
          <div class="flex justify-center">
            <CustomButton @click="stopTest()"> stop testing </CustomButton>
          </div>
        </div>
      </IconCard>

      <!-- display the evaluation metrics -->
      <IconCard>
        <template #title>Test accuracy</template>
        <!-- stats -->
        <div class="grid grid-cols-2 p-4">
          <div class="text-center">
            <span class="text-2xl">{{ currentAccuracy }}</span>
            <span class="text-sm">% of test accuracy</span>
          </div>
          <div class="text-center">
            <span class="text-2xl">{{ visitedSamples }}</span>
            <span class="text-sm">&nbsp;samples visited</span>
          </div>
        </div>
      </IconCard>

      <IconCard
        v-if="confusionMatrix !== undefined"
        class="half-width -4 mx-auto h-full bg-white dark:bg-slate-950 rounded-md"
      >
        <template #title> Confusion Matrix </template>

        <div class="flex flex-row w-full justify-center">
          <table
            class="divide-y-2 divide-slate-600 dark:divide-slate-400 text-center"
          >
            <thead>
              <tr>
                <th
                  class="p-2 text-xs font-medium text-gray-800 dark:text-gray-200 uppercase tracking-wider text-center border-r-gray-600 dark:border-r-gray-400 border-r-2 diagonal-header"
                >
                  Label \ Prediction
                </th>
                <th
                  v-for="(_, label) in confusionMatrix"
                  :key="label"
                  class="p-2 text-xs font-medium text-gray-800 dark:text-gray-200 uppercase tracking-wider"
                >
                  {{ label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="([, row], y) in confusionMatrix" :key="y">
                <td
                  class="p-2 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200 border-r-gray-600 dark:border-r-gray-400 border-r-2"
                >
                  {{ y }}
                </td>
                <td
                  v-for="([, col], x) in row"
                  :key="x"
                  class="p-2 whitespace-nowrap text-sm dark:text-gray-300 text-gray-700"
                >
                  {{ col }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </IconCard>
    </div>
    <div v-if="tested !== undefined">
      <div class="mx-auto text-center pb-8">
        <CustomButton @click="saveCsv()"> download as csv </CustomButton>
      </div>

      <!-- Image gallery -->
      <div v-if="task.dataType === 'image'" class="grid grid-cols-6 gap-6">
        <ImageCard
          v-for="(result, key) in tested as Tested['image']"
          :key="key"
          :image="result.input.image"
        >
          <template #title>
            <p
              class="font-bold uppercase"
              :class="result.output.correct ? 'text-green-500' : 'text-red-700'"
            >
              {{ result.output.truth }}
            </p>
          </template>
        </ImageCard>
      </div>

      <div
        v-else-if="task.dataType === 'tabular'"
        class="mx-auto p-4 w-full h-full max-h-128 bg-white dark:bg-slate-950 rounded-md overflow-x-scroll overflow-y-hidden"
      >
        <TableLayout
          :columns="
            (tested as Tested['tabular']).labels.input
              .concat((tested as Tested['tabular']).labels.output.truth)
              .push((tested as Tested['tabular']).labels.output.correct)
          "
          :rows="
            (tested as Tested['tabular']).results.map(({ input, output }) =>
              input.concat(output.label).push(output.correct.toString()),
            )
          "
        />
      </div>
      <div v-else-if="task.dataType === 'text'">
        <!-- Display nothing for now -->
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup generic="D extends DataType">
import * as d3 from "d3";
import createDebug from "debug";
import { List, Map } from "immutable";
import { computed, ref, toRaw } from "vue";

import type { DataType, Image, Model, Network, Task } from "@epfml/discojs";
import { Validator } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster";
import { useValidationStore } from "@/store";

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
  task: Task<D, Network>;
  model: Model<D>;
}>();

interface Tested {
  image: List<{
    input: { filename: string; image: ImageData };
    output: {
      truth: string;
      correct: boolean;
      predicted: string;
      label: string;
    };
  }>;
  tabular: {
    labels: {
      input: List<string>;
      output: { truth: string; correct: string; label: string };
    };
    results: List<{
      input: List<string>;
      output: {
        truth: number;
        correct: boolean;
        predicted: number;
        label: string;
      };
    }>;
  };
  // TODO what to show?
  text: List<{ output: { correct: boolean } }>;
}

const dataset = ref<LabeledDataset[D]>();
const controller = ref<AbortController>();
const tested = ref<Tested[D]>();

const visitedSamples = computed<number>(() => {
  if (tested.value === undefined) return 0;

  switch (props.task.dataType) {
    case "image":
    case "text":
      return (tested.value as Tested["image" | "text"]).size;
    case "tabular":
      return (tested.value as Tested["tabular"]).results.size;
    default: {
      const _: never = props.task;
      throw new Error("should never happen");
    }
  }
});

const confusionMatrix = computed<Map<string, Map<string, number>> | undefined>(
  () => {
    if (tested.value === undefined) return undefined;

    let labels: string[] = [];
    switch (props.task.dataType) {
      case "image":
        labels = (props.task as Task<"image", Network>).trainingInformation
          .LABEL_LIST;
        break;
      case "tabular":
        labels = ["0", "1"]; // binary classification
        break;
      case "text":
        return undefined;
      default: {
        const _: never = props.task;
        throw new Error("should never happen");
      }
    }

    let matrix = Map(labels.map((l) => [l, Map(labels.map((l) => [l, 0]))]));
    function incrementMatrix(row: string, col: string): void {
      const line = matrix.get(row);
      if (line === undefined) throw new Error("output for unknown label");
      const elem = line.get(col);
      if (elem === undefined) throw new Error("predicted of unknown label");

      matrix = matrix.set(row, line.set(col, elem + 1));
    }

    switch (props.task.dataType) {
      case "image":
        (tested.value as Tested["image"]).map(({ output }) =>
          incrementMatrix(output.label, output.predicted),
        );
        break;
      case "tabular":
        (tested.value as Tested["tabular"]).results.map(({ output }) =>
          incrementMatrix(output.truth.toString(), output.predicted.toString()),
        );
        break;
      default: {
        const _: never = props.task;
        throw new Error("should never happen");
      }
    }

    return matrix;
  },
);

const currentAccuracy = computed<string>(() => {
  if (tested.value === undefined) return "0";
  let hits: number | undefined;
  switch (props.task.dataType) {
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
    switch (props.task.dataType) {
      case "image":
        await startImageTest(
          toRaw(props.task) as Task<"image", Network>,
          toRaw(props.model) as Model<"image">,
          toRaw(dataset.value) as LabeledDataset["image"],
        );
        break;
      case "tabular":
        await startTabularTest(
          toRaw(props.task) as Task<"tabular", Network>,
          toRaw(props.model) as Model<"tabular">,
          toRaw(dataset.value) as LabeledDataset["tabular"],
        );
        break;
      case "text":
        await startTextTest(
          toRaw(props.task) as Task<"text", Network>,
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
  task: Task<"image", Network>,
  model: Model<"image">,
  dataset: LabeledDataset["image"],
): Promise<void> {
  const validator = new Validator(task, model);
  let results: Tested["image"] = List();

  try {
    controller.value = new AbortController();

    for await (const [
      { filename, image, label },
      { predicted, truth },
    ] of dataset.zip(
      validator.test(
        dataset.map(({ image, label }) => [image, label] as [Image, string]),
      ),
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
          label,
          correct: predicted === truth,
          predicted,
          truth,
        },
      });

      tested.value = results as Tested[D];

      if (controller.value.signal.aborted) break;
    }
  } finally {
    controller.value = undefined;
  }
}

async function startTabularTest(
  task: Task<"tabular", Network>,
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
    controller.value = new AbortController();

    for await (const [row, { predicted, truth }] of dataset.zip(
      validator.test(dataset),
    )) {
      const truth_label = row[outputColumn];
      if (truth_label === undefined)
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
          correct: truth === predicted,
          predicted,
          label: truth_label,
        },
      });

      tested.value = { labels, results } as Tested[D];

      if (controller.value.signal.aborted) break;
    }
  } finally {
    controller.value = undefined;
  }
}

async function startTextTest(
  task: Task<"text", Network>,
  model: Model<"text">,
  dataset: LabeledDataset["text"],
): Promise<void> {
  const validator = new Validator(task, model);
  let results: Tested["text"] = List();

  try {
    controller.value = new AbortController();

    for await (const { predicted, truth } of validator.test(dataset)) {
      results = results.push({ output: { correct: predicted === truth } });
      tested.value = results as Tested[D];

      if (controller.value.signal.aborted) break;

      // TODO processing can hog the browser when big enough
      // this allow other computations to run
      // will be fixed by using WebWorker
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
    }
  } finally {
    controller.value = undefined;
  }
}

function stopTest(): void {
  const c = controller.value;
  if (c === undefined) return;

  controller.value = undefined;
  c.abort();
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
    switch (props.task.dataType) {
      case "image":
        return d3.csvFormatRows([
          ["Filename", "Truth", "Correct"],
          ...(tested as Tested["image"]).map(({ input, output }) => [
            input.filename,
            output.label,
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
              .concat(result.output.label)
              .push(result.output.correct.toString())
              .toArray(),
          ),
        ]);
      }
      case "text":
        throw new Error("TODO implement formatter");
    }
  }
}
</script>
