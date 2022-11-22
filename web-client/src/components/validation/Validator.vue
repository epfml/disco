<template>
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
        Predic using model
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

    <div
      v-if="task.trainingInformation.dataType === 'image'"
      class="grid grid-cols-6 gap-6"
    >
      <ImageCard
        v-for="(value, key) in imagesWithPreds"
        :key="key"
        :image-url="value.url"
        :action-url="isGpsVisualization ? getStaticMapUrl(value.prediction) : ''"
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
  </div>
</template>
<script lang="ts" setup>
import { computed, defineProps, ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'

import { browser, data, ConsoleLogger, EmptyMemory, Memory, Task, Validator, getGpsMappingObject, getMapUrl, LabelTypeEnum } from '@epfml/discojs'

import { useMemoryStore } from '@/store/memory'
import { useValidationStore } from '@/store/validation'
import { chartOptions } from '@/charts'
import { useToaster } from '@/composables/toaster'
import ButtonCard from '@/components/containers/ButtonCard.vue'
import ImageCard from '@/components/containers/ImageCard.vue'
import { List } from 'immutable'

const { useIndexedDB } = storeToRefs(useMemoryStore())
const toaster = useToaster()
const validationStore = useValidationStore()

interface Props {
  task: Task
  datasetBuilder?: data.DatasetBuilder<File>
  groundTruth: Boolean
}
const props = defineProps<Props>()

const validator = ref<Validator>(undefined)

const imagesWithPreds = ref<{url: string, prediction: number, groundTruth?: number}[]>([])
const isGpsVisualization = computed<boolean>(() => props.task.displayInformation.labelDisplay.labelType === LabelTypeEnum.GPS)
let gpsMapping: {[key: string]: string} = {}

const memory = computed<Memory>(() => useIndexedDB ? new browser.IndexedDB() : new EmptyMemory())
const accuracyData = computed<number[]>(() => {
  const r = validator.value?.accuracyData()
  return r !== undefined ? r.toArray() : [0]
})
const currentAccuracy = computed<string>(() => {
  const r = validator.value?.accuracy()
  return r !== undefined ? (r * 100).toFixed(2) : '0'
})
const visitedSamples = computed<number>(() => {
  const r = validator.value?.visitedSamples()
  return r !== undefined ? r : 0
})

onMounted(async () => {
  if (isGpsVisualization) {
    gpsMapping = await getGpsMappingObject(props.task.displayInformation.labelDisplay.gpsData.mappingUrl)
  }
})

async function getValidator (): Promise<Validator | undefined> {
  if (validationStore.model === undefined) {
    return undefined
  }
  return new Validator(props.task, new ConsoleLogger(), memory.value, validationStore.model)
}

async function predictUsingModel (): Promise<void> {
  if (props.datasetBuilder?.size() === 0) {
    return toaster.error('No file was given')
  }

  const v = await getValidator()
  if (v !== undefined) {
    validator.value = v
  } else {
    return toaster.error('Model was not found')
  }

  const testingSet: data.Data = (await props.datasetBuilder.build({ inference: true })).train

  toaster.success('Model prediction started')

  const predictions = await validator.value?.predict(testingSet)

  List(props.datasetBuilder.sources).zip(List(predictions)).forEach(([source, prediction]) =>
    imagesWithPreds.value.push({ url: URL.createObjectURL(source), prediction: prediction }))
}

async function assessModel (): Promise<void> {
  if (props.datasetBuilder?.size() === 0) {
    return toaster.error('No file was given')
  }

  const v = await getValidator()
  if (v !== undefined) {
    validator.value = v
  } else {
    return toaster.error('Model was not found')
  }

  const testingSet: data.Data = (await props.datasetBuilder.build()).train

  toaster.success('Model testing started')

  try {
    const assessmentResults: {groundTruth: number, pred:number}[] = await validator.value?.assess(testingSet)

    List(props.datasetBuilder.sources).zip(List(assessmentResults)).forEach(([source, prediction]) =>
      imagesWithPreds.value.push({ url: URL.createObjectURL(source), prediction: prediction.pred, groundTruth: prediction.groundTruth }))
  } catch (e) {
    toaster.error(e instanceof Error ? e.message : e.toString())
  }
}

function getStaticMapUrl (gridLabel: number): string {
  return getMapUrl(props.task.displayInformation.labelDisplay.gpsData.apiKey, gpsMapping[gridLabel])
}

</script>
