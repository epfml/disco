<template>
  <div v-if="task !== undefined && datasetBuilder !== undefined">
    <Description
      v-show="trainingStore.step === 1"
      :task="task"
    />
    <Data
      v-show="trainingStore.step === 2"
      :task="task"
      :dataset-builder="datasetBuilder"
      :is-only-prediction="false"
    />
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
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import type { TaskID } from '@epfml/discojs'
import { data } from '@epfml/discojs'
import { WebImageLoader, WebTabularLoader, WebTextLoader } from '@epfml/discojs-web'

import { useTrainingStore } from '@/store/training'
import { useTasksStore } from '@/store/tasks'
import Description from '@/components/training/Description.vue'
import Trainer from '@/components/training/Trainer.vue'
import Finished from '@/components/training/Finished.vue'
import Data from '@/components/data/Data.vue'

const router = useRouter()
const route = useRoute()
const trainingStore = useTrainingStore()
const tasksStore = useTasksStore()

// task ID given by the route
interface Props { id: TaskID }
const props = defineProps<Props>()

// Init the task once the taskStore has been loaded successfully
// If it is not we redirect to the task list
const task = computed(() => {
  if (tasksStore.loadedSuccessfully) {
    const task = tasksStore.tasks.get(props.id)
    console.log("loadedSuccessfully", props.id, task)
    return task
  }
  // Redirect to the task list if not loaded yet
  // This happens when refreshing the page, every task are reset when fetched
  if (route.name !== 'task-list') {
    router.replace({ name: 'task-list' })
  }
  return undefined
})

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
