<template>
  <div v-if="!verifyingRoute">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 py-6">
      <div
        class="text-center md:text-right"
      >
        <CustomButton
          @click="prevStepOrList"
        >
          Previous
        </CustomButton>
      </div>
      <div
        class="text-center md:text-left"
      >
        <CustomButton
          v-show="trainingStore.step <= 3"
          @click="trainingStore.nextStep"
        >
          Next
        </CustomButton>
      </div>
    </div>

    <Description
      v-show="trainingStore.step === 1"
      :task="task"
    />
    <Data
      v-show="trainingStore.step === 2"
      :task="task"
      :dataset-builder="datasetBuilder"
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
import { computed, onActivated, onMounted, ref, defineProps } from 'vue'
import { useRouter } from 'vue-router'

import { DataType, dataset, TaskID } from '@epfml/discojs'

import { useTrainingStore } from '@/store/training'
import { useTasksStore } from '@/store/tasks'
import { WebImageLoader, WebTabularLoader } from '@/data_loader'
import CustomButton from '@/components/simple/CustomButton.vue'
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
  let dataLoader: dataset.DataLoader<File>
  switch (task.value.dataInformation.type) {
    case DataType.TABULAR:
      dataLoader = new WebTabularLoader(task.value, ',')
      break
    case DataType.IMAGE:
      dataLoader = new WebImageLoader(task.value)
      break
  }
  return new dataset.DatasetBuilder(dataLoader, task.value)
})

onMounted(() => {
  trainingStore.setTask(props.id)
  trainingStore.setStep(1)
})
onActivated(() => { trainingStore.setTask(props.id) })

function prevStepOrList () {
  if (trainingStore.step === 1) {
    router.push({ path: '/list' })
  } else {
    trainingStore.prevStep()
  }
}
</script>
