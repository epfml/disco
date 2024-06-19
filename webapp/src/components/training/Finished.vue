<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 items-stretch">
    <!-- Save the model -->
    <ButtonsCard :buttons="List.of(['test model', testModel])">
      <template #title>
        Test the model
      </template>

      Check the performance of your <DISCOllaborative /> trained model
      by testing it on new data (that was not used in training).
    </ButtonsCard>

    <!-- Test the model -->
    <ButtonsCard :buttons="List.of(['save model', saveModel])">
      <template #title>
        Save the model
      </template>

      Saving the model will allow you to access it later
      to update training in a new <DISCOllaborative />.
    </ButtonsCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { List } from "immutable";

import type { Task, ModelInfo } from '@epfml/discojs'
import { EmptyMemory, Memory } from '@epfml/discojs'
import { IndexedDB } from '@epfml/discojs-web'

import { useMemoryStore } from '@/store/memory'
import { useValidationStore } from '@/store/validation'
import { useToaster } from '@/composables/toaster'
import ButtonsCard from '@/components/containers/ButtonsCard.vue'
import DISCOllaborative from '@/components/simple/DISCOllaborative.vue'

interface Props { task: Task }

const memoryStore = useMemoryStore()
const validationStore = useValidationStore()
const router = useRouter()
const toast = useToaster() // TODO: use this.$toaster

const props = defineProps<Props>()

const memory = computed<Memory>(() => memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory())
const modelInfo = computed<ModelInfo>(() => {
  return {
    type: 'working',
    taskID: props.task.id,
    name: props.task.trainingInformation.modelID,
    tensorBackend: props.task.trainingInformation.tensorBackend,
  }
})

async function testModel () {
  const path = memory.value.getModelMemoryPath(modelInfo.value)
  if (await memory.value.contains(modelInfo.value) && path !== undefined) {
    validationStore.setModel(path)
    router.push({ path: '/evaluate' })
  } else {
    toast.error('Model was not trained!')
  }
}

async function saveModel () {
  if (!(memory.value instanceof EmptyMemory)) {
    if (await memory.value.contains(modelInfo.value)) {
      await memory.value.saveWorkingModel(modelInfo.value)
      toast.success(
        `The current ${props.task.displayInformation.taskTitle} model has been saved.`
      )
    } else {
      toast.error('A model needs to be trained!')
    }
  } else {
    toast.error(
      'The model library is currently turned off. Go to the model library settings to turn it one.'
    )
  }
}
</script>
