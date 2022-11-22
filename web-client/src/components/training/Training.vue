<template>
  <div v-if="!verifyingRoute">
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
import { computed, onMounted, ref, defineProps } from 'vue'
import { useRouter } from 'vue-router'

import { browser, data, TaskID } from '@epfml/discojs'

import { useTrainingStore } from '@/store/training'
import { useTasksStore } from '@/store/tasks'
import Description from '@/components/training/Description.vue'
import Trainer from '@/components/training/Trainer.vue'
import Finished from '@/components/training/Finished.vue'
import Data from '@/components/data/Data.vue'

const router = useRouter()
const trainingStore = useTrainingStore()
const tasksStore = useTasksStore()

// task ID given by the route
interface Props { id: TaskID }
const props = defineProps<Props>()

const verifyingRoute = ref(true)

if (!tasksStore.tasks.has(props.id)) {
  router.replace({ name: 'not-found' })
} else {
  verifyingRoute.value = false
}

const task = computed(() => tasksStore.tasks.get(props.id))
const datasetBuilder = computed(() => {
  let dataLoader: data.DataLoader<File>
  switch (task.value.trainingInformation.dataType) {
    case 'tabular':
      dataLoader = new browser.data.WebTabularLoader(task.value, ',')
      break
    case 'image':
      dataLoader = new browser.data.WebImageLoader(task.value)
      break
    default:
      throw new Error('not implemented')
  }
  return new data.DatasetBuilder(dataLoader, task.value)
})

onMounted(() => {
  trainingStore.setTask(props.id)
  trainingStore.setStep(1)
})
</script>
