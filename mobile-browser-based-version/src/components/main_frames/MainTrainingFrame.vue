<template>
  <!-- If we bind the key to the platform, then whenever \
  the platform is changed the component will be re-built. -->
  <div :key="this.$store.state.platform">
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
import TabularTrainingFrame from '../building_frames/tabular/TabularTrainingFrame.vue'
import ImageTrainingFrame from '../building_frames/image/ImageTrainingFrame.vue'
import { Task } from '../../core/task/task'

export default {
  name: 'main-training-frame',
  props: {
    id: String,
    task: Task
  },
  components: {
    TabularTrainingFrame,
    ImageTrainingFrame
  }
}
</script>
