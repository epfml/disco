<template>
  <training-frame
    :id="id"
    :task="task"
    :data-loader="tabularLoader"
  >
    <template #dataExample>
      <!-- Data Point Example -->
      <div class="relative p-4 overflow-x-hidden">
        <table class="table-auto">
          <thead>
            <tr>
              <th
                v-for="example in task.displayInformation.dataExample"
                :key="example"
                class="px-4 py-2 text-emerald-600"
              >
                {{ example.columnName }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                v-for="example in task.displayInformation.dataExample"
                :key="example"
                class="
                  border border-emerald-500
                  px-4
                  py-2
                  text-emerald-600
                  font-medium
                "
              >
                {{ example.columnData }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </training-frame>
</template>

<script lang="ts">

import { Task } from 'discojs'

import TrainingFrame from './TrainingFrame.vue'
import { WebTabularLoader } from '../../data_loader'

export default {
  name: 'TabularTrainingFrame',
  components: {
    TrainingFrame
  },
  props: {
    id: {
      type: String,
      default: ''
    },
    task: {
      type: Task,
      default: undefined
    }
  },
  created () {
    this.tabularLoader = new WebTabularLoader(this.task, ',')
  }
}
</script>
