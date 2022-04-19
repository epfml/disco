
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
import { Task } from 'discojs'

import TrainingFrame from '../containers/TrainingFrame.vue'
import { WebImageLoader } from '../../../data_loader'

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
    this.imageLoader = new WebImageLoader(this.task)
  }
}
</script>
