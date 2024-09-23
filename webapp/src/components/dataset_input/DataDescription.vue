<template>
  <div class="space-y-4 md:space-y-8">
    <DropdownCard>
      <template #title> Expected Data Format </template>

      <!-- Sample dataset link and instructions -->
       <div class="mb-5 text-left" v-show="task.displayInformation.sampleDatasetLink !== undefined">
          <b>Don't have any data?</b> You can download an example dataset <a target="_blank" class='underline text-blue-400' :href="task.displayInformation.sampleDatasetLink">here</a>.
          <br/><span v-html="task.displayInformation.sampleDatasetInstructions"/><br/>
      </div>

      <div v-if="task.displayInformation.dataFormatInformation !== undefined">
        <div v-html="task.displayInformation.dataFormatInformation" /><br>
      </div>

      <!-- Tabular data example -->
      <div v-if="task.displayInformation.dataExampleText !== undefined" >
        <span v-html="task.displayInformation.dataExampleText" /><br>
        <div
          v-if="['tabular', 'text'].includes(task.trainingInformation.dataType)"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <span
            v-for="(column, idx) in task.displayInformation.dataExample"
            :key="idx"
          >
            <span class="font-bold">{{ column.columnName }}:</span> {{ column.columnData }}
          </span>
        </div>
      </div>

      <!-- Image data example -->
      <div v-if="task.displayInformation.dataExampleImage !== undefined">
        <br>
        <img
          class="mx-auto"
          :src="task.displayInformation.dataExampleImage"
          alt="Error! Image not found"
        >
      </div>
    </DropdownCard>
  </div>
</template>

<script setup lang="ts">
import type { DataType, Task } from "@epfml/discojs";

import DropdownCard from '@/components/containers/DropdownCard.vue'

interface Props {
  task: Task<DataType>
}
const _ = defineProps<Props>()
</script>
