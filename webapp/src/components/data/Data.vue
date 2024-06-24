<template>
  <div class="flex flex-col space-y-4 md:space-y-8">
    <DataHarmonization :task="props.task" />
    <DatasetInput
      :is-only-prediction="isOnlyPrediction"
      :task="task"
      :dataset-builder="props.datasetBuilder"
    />
  </div>
</template>

<script setup lang="ts">
import type { Task } from '@epfml/discojs'
import { data } from '@epfml/discojs'

import DatasetInput from '@/components/data/dataset_input/DatasetInput.vue'
import DataHarmonization from '@/components/data/DataHarmonization.vue'

interface Props {
  task: Task
  datasetBuilder: data.DatasetBuilder<File>
  isOnlyPrediction: boolean
}
const props = defineProps<Props>()
</script>
