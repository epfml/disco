<template>
  <!-- CSV tasks -->
  <!--TODO-->
  <!-- image tasks -->
  <image-testing-frame
    v-if="task.trainingInformation.dataType == 'image'"
    :id="id"
    :task="task"
  />
  <text-testing-frame
    v-else-if="task.trainingInformation.dataType == 'text'"
    :id="id"
    :task="task"
  />
</template>

<script>
import ImageTestingFrame from '../building_frames/image/ImageTestingFrame.vue'
import TextTestingFrame from '../building_frames/text/TextTestingFrame.vue'

export default {
  name: 'main-testing-frame',
  props: {
    id: String,
    task: Object
  },
  components: {
    ImageTestingFrame,
    TextTestingFrame
  },
  async activated () {
    this.$emit('opened-testing')
  }
}
</script>
