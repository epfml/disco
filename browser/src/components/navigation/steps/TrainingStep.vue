<template>
  <div>
    <!-- CSV tasks -->
    <tabular-training-frame
      v-if="task.trainingInformation.dataType === 'tabular'"
      :id="id"
      :task="task"
    />
    <!-- image tasks -->
    <image-training-frame
      v-else-if="task.trainingInformation.dataType === 'image'"
      :id="id"
      :task="task"
    />
  </div>
</template>

<script>
import TabularTrainingFrame from '../../training/TabularTrainingFrame.vue'
import ImageTrainingFrame from '../../training/ImageTrainingFrame.vue'

import { Task } from 'discojs'

export default {
  name: 'MainTrainingFrame',
  components: {
    TabularTrainingFrame,
    ImageTrainingFrame
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
