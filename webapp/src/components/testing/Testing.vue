<template>
  <div>
    <div v-show="validationStore.step === 0">
      <div class="flex flex-col gap-16">
        <div v-if="models.size > 0">
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
                  v-for="[path, [metadata, buttons]] in models"
                  :key="path"
                  class="contents"
                >
                  <ButtonsCard
                    :buttons="buttons"
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
    <div v-if="currentTask !== undefined && datasetBuilder !== undefined">
      <!-- Information specific to the validation panel -->
      <IconCard
        v-if="validationStore.evaluationType === 'test'"
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
        <template v-if="validationStore.step === 1">
          <span v-if="validationStore.evaluationType === 'chat'">
            no data to connect, move to next step to chat
          </span>
          <Data
            v-else
            :task="currentTask"
            :dataset-builder="datasetBuilder"
            :is-only-prediction="validationStore.evaluationType === 'predict'"
          />
        </template>
        <template v-else-if="validationStore.step === 2">
          <TextInput
            v-if="validationStore.evaluationType === 'chat'"
            :task="currentTask"
            :model="currentModel"
          />
          <Tester
            v-else
            :task="currentTask"
            :dataset-builder="datasetBuilder"
            :ground-truth="validationStore.evaluationType === 'test'"
          />
        </template>
      </KeepAlive>
    </div>
  </div>
</template>
<script lang="ts" setup>
import type { Component } from 'vue'
import { watch, computed, ref, shallowRef, onActivated } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { List, Map } from 'immutable'

import type { Model, Path, Task } from '@epfml/discojs'
import { EmptyMemory, Memory, data, client as clients, aggregator } from '@epfml/discojs'
import { IndexedDB, WebImageLoader, WebTabularLoader, WebTextLoader } from '@epfml/discojs-web'

import { CONFIG } from '@/config'
import { useMemoryStore } from '@/store/memory'
import { useTasksStore } from '@/store/tasks'
import type { EvaluationType } from '@/store/validation'
import { useValidationStore } from '@/store/validation'
import Data from '@/components/data/Data.vue'
import Tester from '@/components/testing/Tester.vue'
import ButtonsCard from '@/components/containers/ButtonsCard.vue'
import IconCard from '@/components/containers/IconCard.vue'
import TextInput from "./TextInput.vue";

const validationStore = useValidationStore()
const memoryStore = useMemoryStore()
const tasksStore = useTasksStore()

const { step: stepRef, state: stateRef } = storeToRefs(validationStore)
const currentTask = shallowRef<Task | undefined>(undefined)
const currentModel = ref<Model>()

const federatedTasks = computed<List<Task>>(() =>
  tasksStore.tasks.filter((t) => t.trainingInformation.scheme === 'federated').toList())

const memory = computed<Memory>(() =>
  memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory())
const models = computed(() =>
  memoryStore.models.map((meta, path) => {
    const type = tasksStore.tasks.get(meta.taskID)?.trainingInformation
      .dataType;
    const buttons = List.of<[string, () => void]>(
      ["test", () => selectModel(path, "test")],
      ["predict", () => selectModel(path, "predict")],
    ).concat(
      type === "text"
        ? [["chat", () => selectModel(path, "chat")] as const]
        : [],
    );
    return [meta, buttons] as const;
  }),
);

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

onActivated(() => memoryStore.initModels())

const downloadModel = async (task: Task): Promise<void> => {
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
}
async function selectModel(path: Path, evaluationType: EvaluationType): Promise<void> {
  const taskID = memory.value.getModelInfo(path)?.taskID;
  if (taskID === undefined)
    throw new Error(`Model task id for found in memory for path: ${path}`);

  const selectedTask = tasksStore.tasks.get(taskID);
  if (selectedTask === undefined)
    throw new Error(`Task not found in the task store for task id: ${taskID}`);

  currentTask.value = selectedTask;
  currentModel.value = await memory.value.getModel(path)
  validationStore.model = path;
  validationStore.step = 1;
  validationStore.evaluationType = evaluationType;
}

const taskTitle = (taskID: string): string | undefined => {
  const titled = tasksStore.tasks.get(taskID)
  if (titled !== undefined) {
    return titled.displayInformation.taskTitle
  } else {
    throw new Error('Task title not found for task id: ' + taskID)
  }
}
</script>
