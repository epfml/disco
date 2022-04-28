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
      <keep-alive>
        <description-frame
          v-if="task.displayInformation.tradeoffs"
          :id="task.taskID"
          :overview-text="task.displayInformation.overview"
          :model-text="task.displayInformation.model"
          :trade-offs-text="task.displayInformation.tradeoffs"
          :task="task"
          @next-step="nextStep"
          @refresh-step="refreshStep"
        />
      </keep-alive>
    </div>
  </div>
</template>
<script lang="ts">
import DescriptionFrame from '../../description/DescriptionFrame.vue'
import { Task } from 'discojs'

export default {
  name: 'MainDescriptionFrame',
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
  activated () {
    this.$emit('step', 1)
  },
  methods: {
    refreshStep () {
      this.$emit('refresh-step', 1)
    },
    nextStep () {
      this.$emit('next-step')
    }
  }
}
</script>
