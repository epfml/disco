<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 items-stretch">
    <!-- Save the model -->
    <ButtonCard
      :button-placement="'center'"
      @action="testModel()"
    >
      <template #title>
        Test the model
      </template>
      <template #text>
        Check the performance of your DISCOllaboratively trained model
        by testing it on new data (that was not used in training).
      </template>
      <template #button>
        Test model
      </template>
    </ButtonCard>
    <!-- Test the model -->
    <ButtonCard
      :button-placement="'center'"
      @action="saveModel()"
    >
      <template #title>
        Save the model
      </template>
      <template #text>
        Saving the model will allow you to access it later
        to update training in a new DISCOllaborative.
      </template>
      <template #button>
        Save model
      </template>
    </ButtonCard>
  </div>
</template>

<script setup lang="ts">
import { defineProps, computed } from 'vue'
import { useRouter } from 'vue-router'

import { EmptyMemory, Memory, ModelType, Task, ModelInfo } from '@epfml/discojs-core'
import { IndexedDB } from '@epfml/discojs'

import { useMemoryStore } from '@/store/memory'
import { useValidationStore } from '@/store/validation'
import { useToaster } from '@/composables/toaster'
import ButtonCard from '@/components/containers/ButtonCard.vue'

interface Props {
  task?: Task
}

const memoryStore = useMemoryStore()
const validationStore = useValidationStore()
const router = useRouter()
const toast = useToaster() // TODO: use this.$toaster

const props = defineProps<Props>()

const memory = computed<Memory>(() => memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory())
const modelInfo = computed<ModelInfo>(() => {
  return {
    type: ModelType.WORKING,
    taskID: props.task.id,
    name: props.task.trainingInformation.modelID
  }
})

async function testModel () {
  if (await memory.value.contains(modelInfo.value)) {
    validationStore.setModel(this.memory.pathFor(this.modelInfo))
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
      'The model library is currently turned off. See settings for more information'
    )
  }
}
</script>
