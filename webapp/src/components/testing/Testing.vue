<template>
  <div>
    <div v-show="validationStore.step === 0">
      <div class="flex flex-col gap-16">
        <div v-if="memoryStore.models.size > 0">
          <IconCard title-placement="center">
            <template #title>
              Model Library — <span class="italic">Locally Available and Ready to Test</span>
            </template>
            <template #content>
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
                  <ButtonCard
                    :button-placement="'left'"
                    class="shadow shadow-disco-cyan"
                    @action="() => selectModel(path, false)"
                    @alt-action="() => selectModel(path, true)"
                  >
                    <template #title>
                      {{ taskTitle(metadata.taskID) }}
                    </template>
                    <template #text>
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
                          <span>Type:</span><span>{{ metadata.type === ModelType.SAVED ? 'Saved' : 'Cached' }}</span>
                        </p>
                      </div>
                    </template>
                    <template #button>
                      test
                    </template>
                    <template #altButton>
                      Predict
                    </template>
                  </ButtonCard>
                </div>
              </div>
            </template>
          </IconCard>
        </div>
        <div v-else>
          <IconCard>
            <template #title>
              Empty Model Library
            </template>
            <template #content>
              Disco failed to find any model stored locally. Please go to the <RouterLink
                class="underline font-bold"
                to="/list"
              >
                training page
              </RouterLink>
              or directly download a model below, from the Disco respository.
            </template>
          </IconCard>
        </div>
        <div v-if="federatedTasks.size > 0">
          <IconCard title-placement="center">
            <template #title>
              <span class="font-disco font-normal text-xl text-disco-cyan">DIS</span>
              <span class="font-disco font-normal text-xl text-disco-blue">CO</span>
              Model Repository — <span class="italic">Download and Test</span>
            </template>
            <template #content>
              Select any model below to download it. For federated tasks only.
              The models listed are not currently stored in your browser's memory,
              but are available and downloadable from the remote Disco server.
              <div class="grid gris-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-8 mt-8">
                <div
                  v-for="task in federatedTasks.toArray()"
                  :key="task.id"
                  class="contents"
                >
                  <ButtonCard
                    :button-placement="'left'"
                    class="shadow shadow-disco-cyan"
                    @click="() => downloadModel(task)"
                  >
                    <template #title>
                      {{ task.displayInformation.taskTitle }}
                    </template>
                    <template #text>
                      Download the latest {{ task.displayInformation.taskTitle }} model available on the remote server.
                    </template>
                    <template #button>
                      download
                    </template>
                  </ButtonCard>
                </div>
              </div>
            </template>
          </IconCard>
        </div>
        <div v-else>
          <IconCard>
            <template #title>
              No Remote Models
            </template>
            <template #content>
              Disco failed to fetch any model from the remote server. Is the Disco server running?
            </template>
          </IconCard>
        </div>
      </div>
    </div>
    <div v-if="currentTask !== undefined">
      <!-- Information specific to the validation panel -->
      <IconCard
        v-if="!validationStore.isOnlyPrediction"
        v-show="validationStore.step === 1"
        class="mb-4 md:mb-8"
      >
        <template #title>
          Model Validation
        </template>
        <template #content>
          It is very important that your model is tested against <b class="uppercase">unseen data</b>.
          As such, please ensure your dataset of choice was not used during the training phase of your model.
        </template>
      </IconCard>
      <KeepAlive>
        <component
          :is="currentComponent[0]"
          v-if="currentComponent !== undefined"
          :key="validationStore.model + currentComponent[1]"
          :task="currentTask"
          :dataset-builder="datasetBuilder"
          :ground-truth="!validationStore.isOnlyPrediction"
          :is-only-prediction="validationStore.isOnlyPrediction"
        />
      </KeepAlive>
    </div>
  </div>
</template>
<script lang="ts" setup>
import type { Component } from 'vue'
import { watch, computed, shallowRef, onActivated, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { List } from 'immutable'

import type { Path, Task } from '@epfml/discojs'
import { EmptyMemory, Memory, data, ModelType, client as clients, aggregator } from '@epfml/discojs'
import { IndexedDB, WebImageLoader, WebTabularLoader } from '@epfml/discojs-web'

import { CONFIG } from '@/config'
import { useMemoryStore } from '@/store/memory'
import { useTasksStore } from '@/store/tasks'
import { useValidationStore } from '@/store/validation'
import { useToaster } from '@/composables/toaster'
import Data from '@/components/data/Data.vue'
import Tester from '@/components/testing/Tester.vue'
import ButtonCard from '@/components/containers/ButtonCard.vue'
import IconCard from '@/components/containers/IconCard.vue'

const validationStore = useValidationStore()
const memoryStore = useMemoryStore()
const tasksStore = useTasksStore()

const currentComponent = computed<[Component, string] | undefined>(() => {
  switch (stepRef.value) {
    case 1:
      return [Data, 'data']
    case 2:
      return [Tester, 'tester']
    default:
      return undefined
  }
})

const { step: stepRef, state: stateRef } = storeToRefs(validationStore)

const toaster = useToaster()

const currentTask = shallowRef<Task | undefined>(undefined)

const federatedTasks = computed<List<Task>>(() =>
  tasksStore.tasks.filter((t) => t.trainingInformation.scheme === 'federated').toList())

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
    default:
      throw new Error('not implemented')
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
  const client = new clients.Local(CONFIG.serverUrl, task, aggregator.getAggregator(task))
  const model = await client.getLatestModel()
  const source = {
    type: ModelType.SAVED,
    taskID: task.id,
    name: task.trainingInformation.modelID
  }
  await memory.value.saveModel(source, model)
  await memoryStore.initModels()
}
const selectModel = (path: Path, isOnlyPrediction: boolean): void => {
  const taskID = memory.value.infoFor(path)?.taskID
  if (taskID === undefined) {
    toaster.error('Info for path not found')
    return
  }

  const selectedTask = tasksStore.tasks.get(taskID)
  if (selectedTask !== undefined) {
    currentTask.value = selectedTask
    validationStore.model = path
    validationStore.step = 1
    validationStore.isOnlyPrediction = isOnlyPrediction
  } else {
    toaster.error('Model not found')
  }
}

const taskTitle = (taskID: string): string | undefined => {
  const titled = tasksStore.tasks.get(taskID)
  if (titled !== undefined) {
    return titled.displayInformation.taskTitle
  } else {
    toaster.error('Task not found')
  }
}
</script>
