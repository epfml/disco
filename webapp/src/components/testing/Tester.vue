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
          By clicking the button below, you will be able to validate your model against a chosen dataset of yours.
          Below, once you assessed the model, you can compare the ground truth and the predicted values
          <div class="flex justify-center mt-4">
            <CustomButton @click="testModel()">
              test
            </CustomButton>
          </div>
        </div>
        <div v-else>
          <div class="flex justify-center">
            <CustomButton @click="stopTest()"> stop testing </CustomButton>
          </div>
        </div>
      </IconCard>

      <!--Run inference using the model (no need for labels) -->
      <IconCard v-else
        class="mx-auto mt-10 lg:w-1/2" title-placement="left">
        <template #title> Run model inference </template>

        <div v-if="inferenceGenerator === undefined">
          By clicking the button below, you will be able to predict using the selected model with chosen dataset of yours.

          <div class="flex justify-center mt-4">
            <CustomButton @click="modelInference()">
              predict
            </CustomButton>
          </div>
        </div>
        <div v-else>
          <div class="flex justify-center">
            <CustomButton @click="stopInference()"> stop inference </CustomButton>
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
      <div
        v-else
        class="p-4 mx-auto lg:w-1/2 h-full bg-white rounded-md"
      >
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
          <CustomButton @click="saveCsv()">
            download as csv
          </CustomButton>
          <a ref="downloadLink" class="hidden" />
        </div>
        <!-- Image prediction gallery -->
        <div
          v-if="props.task.trainingInformation.dataType === 'image'"
          class="grid grid-cols-6 gap-6"
        >
          <ImageCard
            v-for="(value, key) in dataWithPred"
            :key="key"
            :image-url="(value.data as ImageWithUrl).url"
          >
            <template #title>
              <p :class="value.groundTruth && value.prediction !== value.groundTruth ? 'text-red-700' : 'text-green-500'">
                Pred: <span class="font-bold">{{ getLabelName(value.prediction) }}</span>
              </p>
            </template>
            <template #subtitle>
              <p
                v-if="value.groundTruth && value.groundTruth !== value.prediction"
                class="text-disco-blue"
              >
                Truth: <span class="font-bold">{{ getLabelName(value.groundTruth) }}</span>
              </p>
            </template>
          </imagecard>
        </div>
        <div
          v-else-if="props.task.trainingInformation.dataType === 'tabular'"
          class="mx-auto lg:w-3/4 h-full bg-white rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
        >
          <TableLayout
            :columns="featuresNames"
            :rows="dataWithPred.map(pred => pred.data)"
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
      <IconCard
        class="w-full lg:w-3/5 mx-auto"
      >
        <template #title> Confusion Matrix ({{ numberOfClasses }}x{{ numberOfClasses }}) </template>

        <table class="auto border-collapse w-full">
          <thead>
            <tr>
              <td />
              <td
                v-for="(_, i) in validator.confusionMatrix"
                :key="i"
                class="
                    text-center text-disco-cyan text-lg font-normal
                    p-3 border-l-2 border-disco-cyan
                  "
              >
                {{ task.trainingInformation.LABEL_LIST === undefined ? 'undefined' : task.trainingInformation.LABEL_LIST[i] }}
              </td>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in validator.confusionMatrix"
              :key="i"
            >
              <th class="text-center text-disco-cyan text-lg font-normal border-t-2 border-disco-cyan">
                {{ task.trainingInformation.LABEL_LIST === undefined ? 'undefined' : task.trainingInformation.LABEL_LIST[i] }}
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

      <IconCard
        v-if="numberOfClasses === 2"
        class="w-full lg:w-3/5 mx-auto"
      >
        <template #title> Evaluation Metrics </template>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 class="font-bold">
              Sensitivity
            </h3><span>{{ validator.confusionMatrix[0] }}</span>
          </div>
          <div>
            <h3 class="font-bold">
              Specificity
            </h3><span>{{ validator.confusionMatrix[1] }}</span>
          </div>
        </div>
      </IconCard>
    </div>
  </div>
</template>
<script lang="ts" setup>
import createDebug from "debug";
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import type { Task, Features } from '@epfml/discojs'
import { data, ConsoleLogger, EmptyMemory, Memory, Validator } from '@epfml/discojs'
import { IndexedDB } from '@epfml/discojs-web'

import { useMemoryStore } from '@/store/memory'
import { useValidationStore } from '@/store/validation'
import { useToaster } from '@/composables/toaster'
import CustomButton from '@/components/simple/CustomButton.vue'
import ImageCard from '@/components/containers/ImageCard.vue'
import IconCard from '@/components/containers/IconCard.vue'
import TableLayout from '@/components/containers/TableLayout.vue'
import { List } from 'immutable'
import * as d3 from 'd3'

const debug = createDebug("webapp:Tester");
const { useIndexedDB } = storeToRefs(useMemoryStore())
const toaster = useToaster()
const validationStore = useValidationStore()

interface Props {
  task: Task
  datasetBuilder: data.DatasetBuilder<File>
  groundTruth: Boolean
}

const props = defineProps<Props>()

interface ImageWithUrl {
  name: string,
  url: string
}

interface DataWithPrediction {
  data: ImageWithUrl | number[]
  prediction?: number
  groundTruth?: number
}

const featuresNames = ref<String[]>([])
const dataWithPred = ref<DataWithPrediction[] | undefined>(undefined)

const validator = ref<Validator | undefined>(undefined)
const numberOfClasses = computed<number>(() =>
  props.task.trainingInformation.LABEL_LIST?.length ?? 2)

type inferenceResults = Array<{ features: Features, pred: number }>
const inferenceGenerator = ref<AsyncGenerator<inferenceResults, void>>();

type testResults = Array<{ groundTruth: number, pred: number, features: Features }>
const testGenerator = ref<AsyncGenerator<testResults, void>>();

function getLabelName(labelIndex: number | undefined): string {
  if (labelIndex === undefined) {
    return ''
  }
  const labelList = props.task.trainingInformation.LABEL_LIST
  if (labelList !== undefined && labelList.length > labelIndex) {
    let label = labelList[labelIndex]
    if (label.length > 6) {
      return label.slice(0,6).concat('...')
    } else {
      return label
    }
  } else {
    return labelIndex.toString()
  }
}

const memory = computed<Memory>(() => useIndexedDB ? new IndexedDB() : new EmptyMemory())

const currentAccuracy = computed<string>(() => {
  const r = validator.value?.accuracy
  return r !== undefined ? (r * 100).toFixed(2) : '0'
})
const visitedSamples = computed<number>(() => {
  const r = validator.value?.visitedSamples
  return r !== undefined ? r : 0
})

const downloadLink = ref<HTMLAnchorElement>()

async function getValidator (): Promise<Validator | undefined> {
  if (validationStore.model === undefined) {
    return undefined
  }
  return new Validator(props.task, new ConsoleLogger(), memory.value, validationStore.model)
}

function handleDatasetBuildError (e: Error) {
  if (e.message.includes('provided in columnConfigs does not match any of the column names')) {
    // missing field is specified between two "quotes"
    const missingFields: String = e.message.split('"')[1].split('"')[0]
    toaster.error(`The input data is missing the field "${missingFields}"`)
  } else {
    toaster.error('Incorrect data format. Please check the expected format at the previous step.')
  }
}

async function modelInference (): Promise<void> {
  if (props.datasetBuilder?.size === 0) {
    toaster.error('Upload a dataset first')
    return
  }

  const v = await getValidator()
  if (v !== undefined) {
    validator.value = v
  } else {
    toaster.error('No model found')
    return
  }
  let testingSet: data.Data
  try {
    testingSet = (await props.datasetBuilder.build({ inference: true })).train
  } catch (e) {
    debug("while building dataset: %o", e);
    if (e instanceof Error) handleDatasetBuildError(e)
    return
  }

  toaster.info('Model inference started')
  try {
    let runningPredictions: inferenceResults = []
    inferenceGenerator.value = validator.value?.inference(testingSet)

    for await (const predictions of inferenceGenerator.value) {
      runningPredictions = runningPredictions.concat(predictions)
      switch (props.task.trainingInformation.dataType) {
        case 'image':
          dataWithPred.value = List(props.datasetBuilder.sources).zip(List(runningPredictions)).map(([source, prediction]) =>
            ({ data: { name: source.name, url: URL.createObjectURL(source) }, prediction: prediction.pred })).toArray()
          break;
        case 'tabular':
          if (props.task.trainingInformation.inputColumns === undefined) {
            throw new Error("no input columns but CSV needs it")
          }
          featuresNames.value = [...props.task.trainingInformation.inputColumns, 'Predicted_' + props.task.trainingInformation.outputColumns]
          dataWithPred.value = runningPredictions.map(pred => ({ data: [...(pred.features as number[]), pred.pred] }))
          break;
        case 'text':
          //TODO add UI results
          break;
      }
    }
    toaster.success('Model inference finished successfully!')
  } catch (e) {
    debug("while infering: %o", e);
    toaster.error("Something went wrong during model inference");
  }
}

async function testModel(): Promise<void> {
  testGenerator.value = undefined
  if (props.datasetBuilder?.size === 0) {
    toaster.error('Upload a dataset first')
    return
  }

  const v = await getValidator()
  if (v !== undefined) {
    validator.value = v
  } else {
    toaster.error('No model found')
    return
  }

  let testingSet: data.Data
  try {
    testingSet = (await props.datasetBuilder.build()).train
  } catch (e) {
    debug("while building dataset: %o", e);
    if (e instanceof Error) handleDatasetBuildError(e)
    return
  }

  toaster.info('Model testing started')
  try {
    testGenerator.value = validator.value?.test(testingSet)
    let runningResults: testResults = []
    for await (const assessmentResults of testGenerator.value) {
      runningResults = runningResults.concat(assessmentResults)
      switch (props.task.trainingInformation.dataType) {
        case 'image':
          dataWithPred.value = List(props.datasetBuilder.sources)
            .zip(List(runningResults))
            .map(([source, prediction]) => ({
              data: {
                name: source.name,
                url: URL.createObjectURL(source)
              },
              prediction: prediction.pred,
              groundTruth: prediction.groundTruth
            })).toArray()
          break;
        case 'tabular':
          if (props.task.trainingInformation.inputColumns === undefined) {
            throw new Error("no input columns but CSV needs it")
          }
          featuresNames.value = [...props.task.trainingInformation.inputColumns, 'Predicted_' + props.task.trainingInformation.outputColumns, 'Target_' + props.task.trainingInformation.outputColumns]
          dataWithPred.value = runningResults.map(pred => ({
            data: [...(pred.features as number[]),
            pred.pred, pred.groundTruth]
          }))
          break;
        case 'text':
          //TODO add UI results
          break;
      }
    }

    toaster.success('Model testing finished successfully!')
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

  testGenerator.value = undefined;
  generator.return();
}

async function stopInference(): Promise<void> {
  const generator = inferenceGenerator.value;
  if (generator === undefined) return;

  inferenceGenerator.value = undefined;
  generator.return();
}

function saveCsv () {
  if (downloadLink.value === undefined) {
    throw new Error("asked to download CSV but page yet rendered")
  }

  if (dataWithPred.value === undefined) {
    throw new Error("asked to save CSV without having training results")
  }

  let csvData: string
  if (props.task.trainingInformation.dataType === 'image') {
    if (props.groundTruth) {
      const rows = dataWithPred.value.map(el => [(el.data as ImageWithUrl).name, String(el.prediction), String(el.groundTruth)])
      csvData = d3.csvFormatRows([['Filename', 'Prediction', 'Ground Truth'], ...rows])
    } else {
      const rows = dataWithPred.value.map(el => [(el.data as ImageWithUrl).name, String(el.prediction)])
      csvData = d3.csvFormatRows([['Filename', 'Prediction'], ...rows])
    }
  } else {
    const featureNames = Object.values(featuresNames.value) as string[]
    const predictionsWithLabels = dataWithPred.value.map(el => Object.values(el.data).map(String))
    csvData = d3.csvFormatRows([featureNames, ...predictionsWithLabels])
  }

  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
  downloadLink.value.setAttribute('href', URL.createObjectURL(blob))
  downloadLink.value.setAttribute('download', `predictions_${props.task.id}_${Date.now()}.csv`)
  downloadLink.value.click()
}

</script>
