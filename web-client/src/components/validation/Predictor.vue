<template>
  <div class="space-y-8">
    <!-- test the model -->
    <ButtonCard
      class="mx-auto mt-10 lg:w-1/2"
      :button-placement="'center'"
      @action="inferModel()"
    >
      <template #title>
        Infer your model
      </template>
      <template #text>
        By clicking the button below, you will be able to infer your model against a chosen dataset of yours.
      </template>
      <template #button>
        Infer
      </template>
    </ButtonCard>
    <div
      class="grid grid-cols-6 gap-6"
    >
      <ImageCard
        v-for="(value, key) in imagesWithPreds"
        :key="key"
        :image-url="value.url"
        :action-url="getStaticMapUrl(value.prediction)"
      >
        <template #title>
          Prediction: <span class="font-bold">{{ value.prediction }}</span>
        </template>
      </imagecard>
    </div>
  </div>

  <!-- display the chart -->
</template>
<script lang="ts" setup>
import { computed, defineProps, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { browser, data, ConsoleLogger, EmptyMemory, Memory, Task, Validator, getMapUrl, getGpsMappingObject, LabelTypeEnum } from '@epfml/discojs'

import { useMemoryStore } from '@/store/memory'
import { useValidationStore } from '@/store/validation'
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
}
const props = defineProps<Props>()

const validator = ref<Validator>(undefined)
const imagesWithPreds = ref<{url: string, prediction: number}[]>([])

const isGpsVisualization = computed<boolean>(() => props.task.displayInformation.labelDisplay.labelType === LabelTypeEnum.GPS)

const memory = computed<Memory>(() => useIndexedDB ? new browser.IndexedDB() : new EmptyMemory())

let gpsMapping: {[key: string]: string} = {}

async function getValidator (): Promise<Validator | undefined> {
  if (validationStore.model === undefined) {
    return undefined
  }
  return new Validator(props.task, new ConsoleLogger(), memory.value, validationStore.model)
}

async function inferModel (): Promise<void> {
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

  toaster.success('Model inference started')

  const predictions = await validator.value?.predict(testingSet)
  List(props.datasetBuilder.sources).zip(List(predictions)).forEach((e) => imagesWithPreds.value.push({ url: URL.createObjectURL(e[0]), prediction: e[1] }))
}

onMounted(async () => {
  if (isGpsVisualization) {
    gpsMapping = await getGpsMappingObject(props.task.displayInformation.labelDisplay.gpsData.mappingUrl)
  }
})

function getStaticMapUrl (gridLabel: number): string {
  return getMapUrl(props.task.displayInformation.labelDisplay.gpsData.apiKey, gpsMapping[gridLabel])
}
</script>
