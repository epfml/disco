
<template>
  <Training
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
  </Training>
</template>

<script lang="ts">
import Training from '@/components/training/Training.vue'
import { WebImageLoader } from '@/data_loader'

import { isTask } from 'discojs'

export default {
  name: 'ImageTraining',
  components: {
    Training
  },
  props: {
    id: {
      type: String,
      default: ''
    },
    task: {
      validator: isTask,
      default: undefined
    }
  },
  created () {
    this.imageLoader = new WebImageLoader(this.task)
  }
}
</script>
