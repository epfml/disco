<script setup lang="ts">
import { computed, defineProps } from 'vue'

import { Task, DataType } from '@epfml/discojs'

import DropdownCard from '../containers/DropdownCard.vue'

interface Props {
  task: Task
}
const props = defineProps<Props>()

const images = require.context('../../../../discojs/example_training_data/', false, /.+?\.(jpg|png)$/)
const exampleImage = computed(() => {
  const source = props.task.displayInformation.dataExampleImage
  return source !== undefined ? images(source) : ''
})
</script>

<template>
  <div class="space-y-4 md:space-y-8">
    <DropdownCard>
      <template #title>
        Data Format
      </template>
      <template #content>
        It is <span class="font-bold">important</span> to harmonize your data to the expected format as described below.<br><br>
        <span v-html="task.displayInformation.dataFormatInformation" />
      </template>
    </DropdownCard>
    <DropdownCard>
      <template #title>
        Example Data
      </template>
      <template #content>
        <span v-html="task.displayInformation.dataExampleText" /><br><br>
        <!-- Tabular data example -->
        <div
          v-if="task.dataInformation.type === DataType.TABULAR"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <span
            v-for="(column, idx) in task.displayInformation.dataExample"
            :key="idx"
          >
            <span class="font-bold">{{ column.columnName }}:</span> {{ column.columnData }}
          </span>
        </div>
        <!-- Image data example -->
        <div v-if="task.dataInformation.type === DataType.IMAGE">
          <img
            class="mx-auto"
            :src="exampleImage"
            alt="Error! Image not found"
          >
        </div>
      </template>
    </DropdownCard>
  </div>
</template>
