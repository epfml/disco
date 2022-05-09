
<template>
  <TrainingFrame
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
  </TrainingFrame>
</template>

<script lang="ts">
import TrainingFrame from './TrainingFrame.vue'
import { WebImageLoader } from '@/data_loader'

import { Task } from 'discojs'

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
