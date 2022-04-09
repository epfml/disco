<template>
  <!-- CSV tasks -->
  <!--TODO-->
  <!-- image tasks -->
  <image-testing-frame
    v-if="task.trainingInformation.dataType == 'image'"
    :id="id"
    :task="task"
  />
  <tabular-testing-frame
    v-else-if="task.trainingInformation.dataType == 'tabular'"
    :id="id"
    :task="task"
  />
</template>

<script>
import ImageTestingFrame from '../building_frames/image/ImageTestingFrame.vue'
import TabularTestingFrame from '../building_frames/tabular/TabularTestingFrame.vue'

export default {
  name: 'MainTestingFrame',
  components: {
    ImageTestingFrame,
    TabularTestingFrame
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
  },
  async activated () {
    this.$emit('opened-testing')
  }
}
</script>
