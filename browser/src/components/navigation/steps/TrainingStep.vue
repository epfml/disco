<template>
  <!-- If we bind the key to the platform, then whenever \
  the platform is changed the component will be re-built. -->
  <div :key="$store.state.platform">
    <!-- CSV tasks -->
    <TabularTrainingFrame
      v-if="task.trainingInformation.dataType === 'tabular'"
      :id="id"
      :task="task"
    />
    <!-- image tasks -->
    <ImageTrainingFrame
      v-else-if="task.trainingInformation.dataType === 'image'"
      :id="id"
      :task="task"
    />
  </div>
</template>

<script lang="ts">
import TabularTrainingFrame from '../../training/TabularTrainingFrame.vue'
import ImageTrainingFrame from '../../training/ImageTrainingFrame.vue'

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
      type: Object,
      default: undefined
    }
  }
}
</script>
