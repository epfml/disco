<template>
  <div v-if="task !== undefined && datasetBuilder !== undefined">
    <Description
      v-show="trainingStore.step === 1"
      :task="task"
    />

    <div
      v-show="trainingStore.step === 2"
      class="flex flex-col space-y-4 md:space-y-8"
    >
      <DataDescription :task="task" />

      <LabeledImageDatasetInput
        v-if="task.trainingInformation.dataType === 'image'"
        :task="task"
        :dataset-builder="datasetBuilder"
      />
      <TabularDatasetInput
        v-if="task.trainingInformation.dataType === 'tabular'"
        :task="task"
        :dataset-builder="datasetBuilder"
      />
      <TextDatasetInput
        v-if="task.trainingInformation.dataType === 'text'"
        :dataset-builder="datasetBuilder"
      />
    </div>

    <Trainer
      v-show="trainingStore.step === 3"
      :task="task"
      :dataset-builder="datasetBuilder"
    />

    <Finished
      v-show="trainingStore.step === 4"
      :task="task"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import type { TaskID } from '@epfml/discojs'
import { data } from '@epfml/discojs'
import { WebImageLoader, WebTabularLoader, WebTextLoader } from '@epfml/discojs-web'

import { useTrainingStore } from '@/store/training'
import { useTasksStore } from '@/store/tasks'
import DataDescription from "@/components/dataset_input/DataDescription.vue";
import Description from '@/components/training/Description.vue'
import Trainer from '@/components/training/Trainer.vue'
import Finished from '@/components/training/Finished.vue'
import LabeledImageDatasetInput from "@/components/dataset_input/LabeledImageDatasetInput/index.vue";
import TabularDatasetInput from "@/components/dataset_input/TabularDatasetInput.vue";
import TextDatasetInput from "@/components/dataset_input/TextDatasetInput.vue";

const router = useRouter()
const route = useRoute()
const trainingStore = useTrainingStore()
const tasksStore = useTasksStore()

// task ID given by the route
interface Props { id: TaskID }
const props = defineProps<Props>()

function setupTrainingStore() {
  trainingStore.setTask(route.params.id as string) // more reliable than props.id
  trainingStore.setStep(1)
}
// Init the task once the taskStore has been loaded successfully
// If it is not we redirect to the task list
const task = computed(() => {
  if (tasksStore.status == 'success') {
    return tasksStore.tasks.get(props.id)
  }
  // Redirect to the task list if not loaded yet
  // This happens when refreshing the page, every task are reset when fetched
  if (route.name !== 'task-list') {
    router.replace({ name: 'task-list' })
  }
  return undefined
})

// Addresses the case when users enter a url manually
// Force the training store to synch with the task specified in the url
// Watching route.fullPath triggers onMount (while route.name would not)
watch(() => route.fullPath, () => {
  if (route.params.id === undefined) return; // don't do anything if not on a task page
  if (trainingStore.step !== 0 && route.params.id === props.id) return; // check that params are consistent
  setupTrainingStore(); // if inconsistent, force sync the training store
})

onMounted(setupTrainingStore)

const datasetBuilder = computed(() => {
  if (task.value === undefined) return

  let dataLoader: data.DataLoader<File>
  switch (task.value.trainingInformation.dataType) {
    case 'tabular':
      dataLoader = new WebTabularLoader(task.value)
      break
    case 'image':
      dataLoader = new WebImageLoader(task.value)
      break
    case 'text':
      dataLoader = new WebTextLoader(task.value)
      break
    default:
      throw new Error('not implemented')
  }
  return new data.DatasetBuilder(dataLoader, task.value)
})
</script>
