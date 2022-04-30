<template>
  <base-layout>
    <progress-bar
      :blocked="true"
      :blocked-step="0"
    />
    <div
      v-for="task in tasks"
      :key="task.taskID"
      class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1"
    >
      <card>
        <div>
          <h6
            class="
              text-xl
              font-medium
              leading-none
              tracking-wider
              group-hover:text-primary-light
            "
          >
            {{ task.displayInformation.taskTitle }}
          </h6>
        </div>
        <div class="ml-10">
          <ul class="text-base ont-semibold text-gray-500 dark:text-light">
            <span v-html="task.displayInformation.summary" />
          </ul>
        </div>
        <div class="py-2">
          <span>
            <custom-button @click="goToSelection(task.taskID)">
              Join
            </custom-button>
          </span>
        </div>
      </card>
    </div>
  </base-layout>
</template>

<script lang="ts">
import BaseLayout from '../containers/BaseLayout.vue'
import ProgressBar from '../navigation/ProgressBar.vue'
import Card from '../containers/Card.vue'
import CustomButton from '../simple/CustomButton.vue'

export default {
  name: 'TaskList',
  components: {
    BaseLayout,
    Card,
    CustomButton,
    ProgressBar
  },
  props: {
    tasks: {
      // Array<Task>() constructor would be preferable but is forbidden by ESLint
      type: Object,
      default: undefined
    }
  },
  methods: {
    goToSelection (taskID: string) {
      this.$router.push({ path: `/${taskID}` })
    }
  }
}
</script>
