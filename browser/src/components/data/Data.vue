<script setup lang="ts">

import { defineProps, provide, readonly } from 'vue'

import { Task, dataset } from '@epfml/discojs'

import DatasetInput from '@/components/data/dataset_input/DatasetInput.vue'
import DataHarmonization from '@/components/data/DataHarmonization.vue'

interface Props {
  task: Task,
  datasetBuilder: dataset.DatasetBuilder<File>
}
const props = defineProps<Props>()

// TODO move provide to parent component
provide('task', readonly(props.task))

</script>
<template>
  <div class="flex flex-col space-y-4 md:space-y-8">
    <DataHarmonization />
    <DatasetInput
      :task="props.task"
      :dataset-builder="props.datasetBuilder"
    />
  </div>
</template>
