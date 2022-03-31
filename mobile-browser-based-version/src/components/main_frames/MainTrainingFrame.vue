<template>
  <!-- If we bind the key to the platform, then whenever \
  the platform is changed the component will be re-built. -->
  <div :key="$store.state.platform">
    <!-- CSV tasks -->
    <csv-training-frame
      v-if="task.trainingInformation.dataType == 'csv'"
      :id="id"
      :task="task"
    />
    <!-- image tasks -->
    <image-training-frame
      v-else-if="task.trainingInformation.dataType == 'image'"
      :id="id"
      :task="task"
    />
  </div>
</template>

<script>
import CsvTrainingFrame from '../building_frames/csv/CsvTrainingFrame.vue'
import ImageTrainingFrame from '../building_frames/image/ImageTrainingFrame.vue'

export default {
  name: 'MainTrainingFrame',
  components: {
    CsvTrainingFrame,
    ImageTrainingFrame
  },
  props: {
    id: {
      type: String,
      default: ''
    },
    task: {
      type: Object,
      default: undefined
    }
  }
}
</script>
