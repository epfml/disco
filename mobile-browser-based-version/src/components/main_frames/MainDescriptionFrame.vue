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
        />
      </keep-alive>
    </div>
  </div>
</template>
<script>
import DescriptionFrame from '../building_frames/DescriptionFrame.vue'
import { Task } from '../../core/task/task'

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
  }
}
</script>
