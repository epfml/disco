<template>
  <div
    class="
      flex flex-col
      pt-4
      items-right
      justify-start
      flex-1
      h-full
      min-h-screen
      p-4
      overflow-x-hidden overflow-y-auto
    "
  >
    <div>
      <DescriptionFrame
        v-if="task.displayInformation.tradeoffs"
        :id="task.taskID"
        :overview-text="task.displayInformation.overview"
        :model-text="task.displayInformation.model"
        :trade-offs-text="task.displayInformation.tradeoffs"
        :task="task"
        @next-step="nextStep"
        @prev-step="prevStep"
      />
    </div>
  </div>
</template>
<script lang="ts">
import DescriptionFrame from '@/components/description/DescriptionFrame.vue'

import { Task } from 'discojs'

export default {
  name: 'DescriptionStep',
  components: {
    DescriptionFrame
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
  methods: {
    nextStep () {
      this.$emit('next-step')
    },
    prevStep () {
      this.$emit('prev-step')
    }
  }
}
</script>
