<script setup lang="ts">
import { computed, inject } from 'vue'

import { Task } from '@epfml/discojs'

import DropdownCard from '../containers/DropdownCard.vue'

const task = inject<Task>('task')

const images = require.context('../../../../discojs/example_training_data/', false, /.+?\.(jpg|png)$/)
const exampleImage = computed(() => {
  const source = task.displayInformation.dataExampleImage
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
          v-if="task.trainingInformation.dataType === 'tabular'"
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
        <div v-if="task.trainingInformation.dataType === 'image'">
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
