
<template>
  <training-frame
    :id="id"
    :task="task"
    :data-loader="imageLoader"
  >
    <!--<template #dataExample>
      Data Point Example
      <div class="flex object-center">
        <img
          class="object-center"
          :src="getExampleImage(task.displayInformation.dataExampleImage)"
        ><img>
      </div>
    </template> -->
    <template #extra />
  </training-frame>
</template>

<script>
import TrainingFrame from '../containers/TrainingFrame.vue'
import { Task, dataset } from 'discojs'

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
  created () {
    this.imageLoader = new dataset.ImageLoader(this.task)
  }
}
</script>
