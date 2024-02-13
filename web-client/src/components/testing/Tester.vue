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
        <template #title>
          Test & validate your model
        </template>
        <template #text>
          By clicking the button below, you will be able to validate your model against a chosen dataset of yours.
          Below, once you assessed the model, you can compare the ground truth and the predicted values
        </template>
        <template #button>
          Test
        </template>
      </ButtonCard>
      <!--only predict using the model -->
      <ButtonCard
        v-else
        class="mx-auto mt-10 lg:w-1/2"
        :button-placement="'center'"
        @action="predictUsingModel()"
      >
        <template #title>
          Predict using model
        </template>
        <template #text>
          By clicking the button below, you will be able to predict using the selected model with chosen dataset of yours.
        </template>
        <template #button>
          Predict
        </template>
      </ButtonCard>

      <!-- display the chart -->
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
        <!-- chart -->
        <apexchart
          width="100%"
          height="200"
          type="area"
          :options="chartOptions"
          :series="[{ data: accuracyData }]"
        />
      </div>

      <div v-if="dataWithPred">
        <div class="mx-auto lg:w-1/2 text-center pb-8">
          <CustomButton @click="saveCsv()">
            Download as CSV
          </CustomButton>
          <a
            id="downloadLink"
            class="hidden"
          />
        </div>

        <div
          v-if="isImageTaskType"
          class="grid grid-cols-6 gap-6"
        >
          <ImageCard
            v-for="(value, key) in dataWithPred"
            :key="key"
            :image-url="(value.data as ImageWithUrl).url"
            :show-button="isPolygonMapVisualization"
            @click="openMapModal(value.prediction, value.groundTruth)"
          >
            <template #title>
              <p :class="value.groundTruth && value.prediction !== value.groundTruth ? 'text-red-700' : 'text-disco-blue'">
                Prediction: <span class="font-bold">{{ value.prediction }}</span>
              </p>
            </template>
            <template #subtitle>
              <p
                v-if="value.groundTruth && value.groundTruth !== value.prediction"
                class="text-disco-blue"
              >
                Ground truth: <span class="font-bold">{{ value.groundTruth }}</span>
              </p>
            </template>
          </imagecard>
        </div>
        <div
          v-else
          class="mx-auto lg:w-3/4 h-full bg-white rounded-md max-h-128 overflow-x-scroll overflow-y-hidden"
        >
          <TableLayout
            :columns="featuresNames"
            :rows="dataWithPred.map(pred => pred.data)"
          />
        </div>
      </div>
    </div>
    <!-- Main modal -->
    <div
      tabindex="-1"
      aria-hidden="true"
      :class="{'hidden': !mapModalUrl}"
      class="overflow-y-auto overflow-x-hidden absolute top-0 right-0 left-0 z-40 w-full md:inset-0 md:h-full bg-black/60 backdrop-blur-sm"
    >
      <div
        class="relative z-50 w-full max-w-4xl h-full md:h-auto top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      >
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
          <!-- Modal header -->
          <div class="flex justify-between items-start p-4 rounded-t border-b dark:border-gray-600">
            <h3 class="text-xl font-semibold text-disco-blue dark:text-white">
              Map Visualizer
            </h3>
            <button
              type="button"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
              @click="mapModalUrl = null"
            >
              <svg
                aria-hidden="true"
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              ><path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              /></svg>
              <span class="sr-only">Close modal</span>
            </button>
          </div>
          <!-- Modal body -->
          <div>
            <iframe
              class="h-128 w-full rounded-b-lg"
              :src="mapModalUrl"
            />
          </div>
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
                  class="
                      text-center text-disco-cyan text-lg font-normal
                      p-3 border-l-2 border-disco-cyan
                    "
                >
                  {{ task.trainingInformation.LABEL_LIST[i] }}
                </td>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in validator.confusionMatrix"
                :key="i"
              >
                <th class="text-center text-disco-cyan text-lg font-normal border-t-2 border-disco-cyan">
                  {{ task.trainingInformation.LABEL_LIST[i] }}
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
      <IconCard
        v-if="numberOfClasses === 2"
        class="w-full lg:w-3/5 mx-auto"
      >
        <template #title>
          Evaluation Metrics
        </template>
        <template #content>
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
        </template>
      </IconCard>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, defineProps, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { data, ConsoleLogger, EmptyMemory, Memory, Task, Validator, LabelTypeEnum } from '@epfml/discojs-core'
import { IndexedDB } from '@epfml/discojs'

import { useMemoryStore } from '@/store/memory'
import { useValidationStore } from '@/store/validation'
import { chartOptions } from '@/charts'
import { useToaster } from '@/composables/toaster'
import ButtonCard from '@/components/containers/ButtonCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import ImageCard from '@/components/containers/ImageCard.vue'
import IconCard from '@/components/containers/IconCard.vue'
import TableLayout from '@/components/containers/TableLayout.vue'
import { List } from 'immutable'
import * as d3 from 'd3'

const { useIndexedDB } = storeToRefs(useMemoryStore())
const toaster = useToaster()
const validationStore = useValidationStore()

interface Props {
  task: Task
  datasetBuilder?: data.DatasetBuilder<File>
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

const featuresNames = ref<String[]>(null)
const dataWithPred = ref<DataWithPrediction[]>(null)

const validator = ref<Validator>(undefined)
const mapModalUrl = ref<string>(null)

const numberOfClasses = computed<number>(() =>
  props.task.trainingInformation.LABEL_LIST?.length ?? 2)
const isImageTaskType = computed<boolean>(() =>
  props.task.trainingInformation.dataType === 'image')
const isPolygonMapVisualization = computed<boolean>(() =>
  props.task.displayInformation.labelDisplay.labelType === LabelTypeEnum.POLYGON_MAP)

const memory = computed<Memory>(() => useIndexedDB ? new IndexedDB() : new EmptyMemory())
const accuracyData = computed<number[]>(() => {
  const r = validator.value?.accuracyData
  return r !== undefined ? r.toArray() : [0]
})
const currentAccuracy = computed<string>(() => {
  const r = validator.value?.accuracy
  return r !== undefined ? (r * 100).toFixed(2) : '0'
})
const visitedSamples = computed<number>(() => {
  const r = validator.value?.visitedSamples
  return r !== undefined ? r : 0
})

async function getValidator (): Promise<Validator | undefined> {
  if (validationStore.model === undefined) {
    return undefined
  }
  return new Validator(props.task, new ConsoleLogger(), memory.value, validationStore.model)
}

function handleDatasetBuildError (e: Error) {
  console.log(e.message)
  if (e.message.includes('provided in columnConfigs does not match any of the column names')) {
    // missing field is specified between two "quotes"
    const missingFields: String = e.message.split('"')[1].split('"')[0]
    toaster.error(`The input data is missing the field "${missingFields}"`)
  } else {
    toaster.error('Incorrect data format. Please check the expected format at the previous step.')
  }
}

async function predictUsingModel (): Promise<void> {
  if (props.datasetBuilder?.size === 0) {
    return toaster.error('Upload a dataset first')
  }

  const v = await getValidator()
  if (v !== undefined) {
    validator.value = v
  } else {
    return toaster.error('No model found')
  }
  let testingSet: data.Data
  try {
    testingSet = (await props.datasetBuilder.build({ inference: true })).train
  } catch (e) {
    handleDatasetBuildError(e)
    return
  }

  toaster.info('Model prediction started')
  const predictions = await validator.value?.predict(testingSet)

  if (isImageTaskType.value) {
    dataWithPred.value = List(props.datasetBuilder.sources).zip(List(predictions)).map(([source, prediction]) =>
      ({ data: { name: source.name, url: URL.createObjectURL(source) }, prediction: prediction.pred })).toArray()
  } else {
    featuresNames.value = [...props.task.trainingInformation.inputColumns, 'Predicted_' + props.task.trainingInformation.outputColumns]
    dataWithPred.value = predictions.map(pred => ({ data: [...(pred.features as number[]), pred.pred] }))
  }
  toaster.success('Model prediction finished successfully!')
}

async function assessModel (): Promise<void> {
  if (props.datasetBuilder?.size === 0) {
    return toaster.error('Upload a dataset first')
  }

  const v = await getValidator()
  if (v !== undefined) {
    validator.value = v
  } else {
    return toaster.error('No model found')
  }

  let testingSet: data.Data
  try {
    testingSet = (await props.datasetBuilder.build()).train
  } catch (e) {
    handleDatasetBuildError(e)
    return
  }

  toaster.info('Model testing started')
  try {
    const assessmentResults = await validator.value?.assess(testingSet)

    if (isImageTaskType.value) {
      dataWithPred.value = List(props.datasetBuilder.sources).zip(List(assessmentResults)).map(([source, prediction]) =>
        ({ data: { name: source.name, url: URL.createObjectURL(source) }, prediction: prediction.pred, groundTruth: prediction.groundTruth })).toArray()
    } else {
      featuresNames.value = [...props.task.trainingInformation.inputColumns, 'Predicted_' + props.task.trainingInformation.outputColumns, 'Target_' + props.task.trainingInformation.outputColumns]
      dataWithPred.value = assessmentResults.map(pred => ({ data: [...(pred.features as number[]), pred.pred, pred.groundTruth] }))
    }
    toaster.success('Model testing finished successfully!')
  } catch (e) {
    toaster.error(e instanceof Error ? e.message : e.toString())
  }
}

function openMapModal (prediction: number, groundTruth?: number) {
  const baseUrl = props.task.displayInformation.labelDisplay.mapBaseUrl
  if (isPolygonMapVisualization.value && baseUrl) {
    const correctColor = '274C78'
    const errorColor = 'FF0000'

    if (groundTruth && groundTruth !== prediction) {
      mapModalUrl.value = `${baseUrl}?cellIds=${prediction},${groundTruth}&colors=${errorColor},${correctColor}`
    } else {
      mapModalUrl.value = `${baseUrl}?cellIds=${prediction}&colors=${correctColor}`
    }
  }
}

function saveCsv () {
  let csvData: string

  if (isImageTaskType.value) {
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
  const downloadLink = document.getElementById('downloadLink')
  downloadLink.setAttribute('href', URL.createObjectURL(blob))
  downloadLink.setAttribute('download', `predictions_${props.task.id}_${Date.now()}.csv`)
  downloadLink.click()
}

</script>
