<template>
  <testing-frame
    :id="id"
    :task="task"
    :helper="helper"
  >
    <template #dataExample>
      <!-- Data Point Example -->
      <div class="relative p-4 overflow-x-hidden">
        <table class="table-auto">
          <thead>
            <tr>
              <th
                v-for="example in dataExample"
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
                v-for="example in dataExample"
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
  </testing-frame>
</template>

<script>
import TestingFrame from './TestingFrame.vue'
import { Task } from 'discojs'

export default {
  name: 'TabularTestingFrame',
  components: {
    TestingFrame
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
  data () {
    return {
      dataExample: this.task.displayInformation.dataExample.filter(
        (item) => item.columnName !== this.task.classColumn
      )
    }
  }
}
</script>
