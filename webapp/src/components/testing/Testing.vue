<template>
  <div v-show="validationStore.step === 0">
    <div class="flex flex-col gap-8">
      <div v-if="memoryStore.models.size > 0">
        <IconCard title-placement="center">
          <template #title>
            Model Library —
            <span class="italic">Locally Available and Ready to Test</span>
          </template>

          Test any model below against a validation dataset.
          The models listed were downloaded from the remote server.
          Perhaps you even contributed to their training!
          Note that these models are currently stored within your browser's memory.

          <div class="grid gris-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-8 mt-8">
            <div
              v-for="[path, metadata] in memoryStore.models"
              :key="path"
              class="contents"
            >
              <ButtonsCard
                :buttons="List.of(
                  ['test', () => selectModel(path, false)],
                  ['predict', () => selectModel(path, true)],
                )"
                class="shadow shadow-disco-cyan"
              >
                <template #title>
                  {{ taskTitle(metadata.taskID) }}
                </template>

                <div class="grid grid-cols-2 justify-items-between">
                  <p class="contents">
                    <span>Model:</span>
                    <span>
                      {{ metadata.name.slice(0, 20) }}
                      <span v-if="metadata.version !== undefined && metadata.version !== 0">
                        ({{ metadata.version }})
                      </span>
                    </span>
                  </p>
                  <p class="contents">
                    <span>Date:</span>
                    <span>{{ metadata.date }} at {{ metadata.hours }}</span>
                  </p>
                  <p class="contents">
                    <span>Size:</span><span>{{ metadata.fileSize }} kB</span>
                  </p>
                  <p class="contents">
                    <span>Type:</span><span>{{ metadata.type === 'saved' ? 'Saved' : 'Cached' }}</span>
                  </p>
                </div>
              </ButtonsCard>
            </div>
          </div>
        </IconCard>
      </div>
      <div v-else>
        <IconCard>
          <template #title> Empty Model Library </template>

          Disco failed to find any model stored locally. Please go to the
          <RouterLink
            class="underline text-blue-400"
            to="/list"
          >training page</RouterLink>
          or directly download a model below, from the Disco repository.
        </IconCard>
      </div>

      <div>
        <IconCard title-placement="center">
          <template #title>
            <DISCO />
            Model Repository — <span class="italic">Download and Test</span>
          </template>

          <div
            v-if="tasksStore.status == 'loading'"
            class="my-10 flex flex-col justify-center items-center"
          >
            <VueSpinner size="50" color="#6096BA"/>
            <div class="mt-10 flex flex-col justify-center items-center">
              <p class="text-disco-blue">Loading <DISCOllaboratives/></p>
              <p class="text-disco-blue text-xs">This can take a few seconds</p>
            </div>
          </div>
          <div v-else-if="federatedTasks.size > 0">
            Select any model below to download it. For federated tasks only.
            The models listed are not currently stored in your browser's memory,
            but are available and downloadable from the remote Disco server.
            <div class="grid gris-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-8 mt-8">
              <div
                v-for="task in federatedTasks.toArray()"
                :key="task.id"
                class="contents"
              >
                <ButtonsCard
                  :buttons="List.of(['download', () => downloadModel(task)])"
                  class="shadow shadow-disco-cyan"
                >
                  <template #title>
                    {{ task.displayInformation.taskTitle }}
                  </template>

                  Download the latest {{ task.displayInformation.taskTitle }} model available on the remote server.
                </ButtonsCard>
              </div>
            </div>
          </div>
          <div v-else>
            A problem occurred while fetching <DISCOllaboratives/>
          </div>
        </IconCard>
      </div>
    </div>
  </div>
  <div v-if="currentTask !== undefined && datasetBuilder !== undefined">
    <!-- Information specific to the validation panel -->
    <IconCard
      v-if="!validationStore.isOnlyPrediction"
      v-show="validationStore.step === 1"
      class="mb-4 md:mb-8"
    >
      <template #title> Model Validation </template>

      It is very important that your model is tested against <b class="uppercase">unseen data</b>.
      As such, please ensure your dataset of choice was not used during the training phase of your model.
    </IconCard>
    <!-- Language model prompting is currently unavailable   -->
    <div
      v-if="currentTask.trainingInformation.dataType === 'text' && validationStore.isOnlyPrediction"
      v-show="validationStore.step !== 0"
    >
      <div class="flex justify-center items-center mb-4">
        <span class="shrink-0 py-4 px-4 bg-orange-100 rounded-md">
          <p class="text-slate-600 text-xs">Prompting a language model will be available soon!</p>
        </span>
      </div>
    </div>

    <KeepAlive>
      <Data
        v-if="stepRef === 1"
        :task="currentTask"
        :dataset-builder="datasetBuilder"
        :ground-truth="!validationStore.isOnlyPrediction"
        :is-only-prediction="validationStore.isOnlyPrediction"
      />
    </KeepAlive>

    <KeepAlive>
      <Tester
        v-if="stepRef === 2"
        :task="currentTask"
        :dataset-builder="datasetBuilder"
        :ground-truth="!validationStore.isOnlyPrediction"
        :is-only-prediction="validationStore.isOnlyPrediction"
      />
    </KeepAlive>
  </div>
</template>
<script lang="ts" setup>
import { watch, computed, shallowRef, onActivated, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { List } from 'immutable'
import { VueSpinner } from 'vue3-spinners';

import type { Path, Task } from '@epfml/discojs'
import { EmptyMemory, Memory, data, client as clients, aggregator } from '@epfml/discojs'
import { IndexedDB, WebImageLoader, WebTabularLoader, WebTextLoader } from '@epfml/discojs-web'

import { CONFIG } from '@/config'
import { useMemoryStore } from '@/store/memory'
import { useTasksStore } from '@/store/tasks'
import { useValidationStore } from '@/store/validation'
import Data from '@/components/data/Data.vue'
import DISCO from "@/components/simple/DISCO.vue";
import Tester from '@/components/testing/Tester.vue'
import ButtonsCard from '@/components/containers/ButtonsCard.vue'
import IconCard from '@/components/containers/IconCard.vue'
import DISCOllaboratives from '@/components/simple/DISCOllaboratives.vue'
import { useToaster } from '@/composables/toaster'

const validationStore = useValidationStore()
const memoryStore = useMemoryStore()
const tasksStore = useTasksStore()

const toaster = useToaster()

const { step: stepRef, state: stateRef } = storeToRefs(validationStore)
const currentTask = shallowRef<Task | undefined>(undefined)

const federatedTasks = computed<List<Task>>(() =>
  tasksStore.tasks?.filter((t) => t.trainingInformation.scheme === 'federated').toList())

const memory = computed<Memory>(() =>
  memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory())

const datasetBuilder = computed<data.DatasetBuilder<File> | undefined>(() => {
  if (currentTask.value === undefined) {
    return undefined
  }
  let dataLoader: data.DataLoader<File>
  switch (currentTask.value.trainingInformation.dataType) {
    case 'tabular':
      dataLoader = new WebTabularLoader(currentTask.value, ',')
      break
    case 'image':
      dataLoader = new WebImageLoader(currentTask.value)
      break
    case 'text':
      dataLoader = new WebTextLoader(currentTask.value)
      break
    default:
      throw new Error(`Browser data loader for data type ${currentTask.value.trainingInformation.dataType} is not implemented`)
  }
  return new data.DatasetBuilder(dataLoader, currentTask.value)
})

watch(stateRef, () => {
  if (validationStore.model !== undefined) {
    selectModel(validationStore.model, false)
  }
})
watch(stepRef, async (v) => {
  if (v === 0) {
    await memoryStore.initModels()
  }
})

onMounted(async () => {
  await memoryStore.initModels()
  // can't watch before mount
  if (validationStore.model !== undefined) {
    selectModel(validationStore.model, false)
  }
})
onActivated(async () => {
  await memoryStore.initModels()
})

const downloadModel = async (task: Task): Promise<void> => {
  try {
    const client = new clients.Local(CONFIG.serverUrl, task, aggregator.getAggregator(task))
    const model = await client.getLatestModel()
    const source = {
      type: 'saved' as const,
      taskID: task.id,
      name: task.trainingInformation.modelID,
      tensorBackend: task.trainingInformation.tensorBackend,
    }
    await memory.value.saveModel(source, model)
    await memoryStore.initModels()
    toaster.success("Model successfully downloaded!")
    const scrollableDiv = document.getElementById('scrollable-div')
    if (scrollableDiv !== null) {
      scrollableDiv.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }
  } catch (e) {
    toaster.error("Something went wrong, please try again later.")
    console.error(e)
  }
}

const selectModel = (path: Path, isOnlyPrediction: boolean): void => {
  const taskID = memory.value.getModelInfo(path)?.taskID
  if (taskID === undefined) {
    throw new Error('Model task id for found in memory for path: ' + path)
  }

  const selectedTask = tasksStore.tasks.get(taskID)
  if (selectedTask !== undefined) {
    currentTask.value = selectedTask
    validationStore.model = path
    validationStore.step = 1
    validationStore.isOnlyPrediction = isOnlyPrediction
  } else {
    throw new Error('Task not found in the task store for task id: ' + taskID)
  }
}

const taskTitle = (taskID: string): string | undefined => {
  if (tasksStore.status == 'success') {
    const titled = tasksStore.tasks.get(taskID)
    if (titled !== undefined) {
      return titled.displayInformation.taskTitle
    } else {
      throw new Error('Task title not found for task id: ' + taskID)
    }
  }
  return undefined
}
</script>
