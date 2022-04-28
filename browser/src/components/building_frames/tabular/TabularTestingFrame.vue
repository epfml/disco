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
    <template #extra>
      <!-- Modification of Header Card -->

      <icon-card
        header="Map My Data"
        :description="dataExampleText"
      >
        <template #icon>
          <bezier-2 />
        </template>
        <template #extra>
          <!-- Display all the possible headers -->
          <div id="mapHeader">
            <ul
              class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 xl:grid-cols-4"
            >
              <li
                v-for="header in task.getTestingHeaders()"
                :key="header.id"
                class="border-gray-400"
              >
                <div
                  class="
                    select-none
                    p-2
                    transition
                    duration-500
                    ease-in-out
                    transform
                    hover:-translate-y-2
                    rounded-2xl
                    border-2
                    p-6
                    hover:shadow-2xl
                    border-primary-dark
                  "
                >
                  <div class="grid grid-cols-3 items-center p-2">
                    <div class="pl-1">
                      <div class="font-medium">
                        <div class="flex flex-row justify-start">
                          {{ header.id }}
                        </div>
                      </div>
                    </div>
                    <div>&larr;</div>
                    <div class="mb-3 pt-0">
                      <input
                        v-model="header.userHeader"
                        type="text"
                        placeholder="Enter your header"
                        class="
                          p-1
                          placeholder-gray-400
                          text-gray-700
                          dark:text-white
                          relative
                          bg-white
                          dark:bg-dark
                          rounded
                          text-sm
                          shadow
                          outline-none
                          focus:outline-none focus:shadow-outline
                          w-full
                        "
                      >
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </template>
      </icon-card>
    </template>
  </testing-frame>
</template>

<script>
import TestingFrame from '../containers/TestingFrame.vue'
import IconCard from '../../containers/IconCard.vue'
import Bezier2 from '../../../assets/svg/Bezier2.vue'
import { Task } from 'discojs'

export default {
  name: 'TabularTestingFrame',
  components: {
    IconCard,
    TestingFrame,
    Bezier2
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
