<template>
  <!-- If we bind the key to the platform, then whenever \
  the platform is changed the component will be re-built. -->
  <div :key="this.$store.state.platform">
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
  name: 'main-training-frame',
  props: {
<<<<<<< HEAD
    id: String,
    task: Object,
=======
    Id: String,
    Task: Object
>>>>>>> f3c86fb70cf59ee1125bc53798c7bb45e5eee31a
  },
  components: {
    CsvTrainingFrame,
    ImageTrainingFrame
  }
}
</script>
