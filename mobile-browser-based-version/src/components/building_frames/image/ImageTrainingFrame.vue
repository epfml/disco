
<template>
  <training-frame :id="id" :task="task" :dataLoader="imageLoader">
    <template v-slot:dataExample>
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
import { ImageLoader } from '../../../core/dataset/data_loader/image_loader'
import { Task } from '../../../core/task/task'

export default {
  name: 'ImageTrainingFrame',
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
  mounted () {
    this.imageLoader = new ImageLoader()
  }
}
</script>
