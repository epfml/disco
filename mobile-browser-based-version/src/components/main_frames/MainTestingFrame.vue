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
  name: 'MainTestingFrame',
  components: {
    ImageTestingFrame,
    CsvTestingFrame
  },
  props: {
    id: String,
    task: Object
  },
  async activated () {
    this.$emit('opened-testing')
  }
}
</script>
