<template>
  <!-- CSV tasks -->
  <!--TODO-->
  <!-- image tasks -->
  <ImageTestingFrame
    v-if="task.trainingInformation.dataType == 'image'"
    :id="id"
    :task="task"
  />
  <TabularTestingFrame
    v-else-if="task.trainingInformation.dataType == 'tabular'"
    :id="id"
    :task="task"
  />
</template>

<script lang="ts">
import ImageTestingFrame from '../../testing/ImageTestingFrame.vue'
import TabularTestingFrame from '../../testing/TabularTestingFrame.vue'

export default {
  name: 'TrainingStep',
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
  }
}
</script>
