<template>
  <div class="flex flex-col space-y-4 md:space-y-8">
    <DataHarmonization :task="props.task" />
    <DatasetInput
      :task="task"
      :dataset-builder="props.datasetBuilder"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

import { data, Task } from '@epfml/discojs'

import DatasetInput from '@/components/data/dataset_input/DatasetInput.vue'
import DataHarmonization from '@/components/data/DataHarmonization.vue'

interface Props {
  task: Task
  datasetBuilder: data.DatasetBuilder<File>
}
const props = defineProps<Props>()
</script>
