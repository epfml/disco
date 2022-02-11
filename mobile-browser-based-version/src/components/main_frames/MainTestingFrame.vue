<template>
  <!-- CSV tasks -->
  <!--TODO-->
  <!-- image tasks -->
  <image-testing-frame
    v-if="task.trainingInformation.dataType == 'image'"
    :id="id"
    :task="task"
  />
  <csv-testing-frame
    v-else-if="task.trainingInformation.dataType == 'csv'"
    :id="id"
    :task="task"
  />
</template>

<script>
import ImageTestingFrame from '../building_frames/image/ImageTestingFrame.vue'
import CsvTestingFrame from '../building_frames/csv/CsvTestingFrame.vue'

export default {
  name: 'main-testing-frame',
  props: {
    id: String,
    task: Object,
  },
  components: {
    ImageTestingFrame,
    CsvTestingFrame
  },
  async activated () {
    this.$emit('opened-testing')
  }
}
</script>
