<template>
  <training-frame
    :id="id"
    :task="task"
  >
    <template #dataExample>
      <!-- Data Point Example -->
      <div class="flex object-center">
        <img
          class="object-center"
          :src="task.getExampleImage(task.displayInformation.dataExampleImage)"
          :alt="task.displayInformation.dataExampleImage"
        ><img>
      </div>
    </template>
    <template #extra />
  </training-frame>
</template>

<script>
import TrainingFrame from '../containers/TrainingFrame.vue'
import { ImageTaskHelper } from '../../../core/task/image/image_task_helper'

export default {
  name: 'ImageTrainingFrame',
  components: {
    TrainingFrame
  },
  props: {
    id: String,
    task: Object
  },
  data () {
    return {
      helper: new ImageTaskHelper(this.task)
    }
  }
}
</script>
