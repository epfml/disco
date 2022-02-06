<template>
  <!-- If we bind the key to the platform, then whenever \
  the platform is changed the component will be re-built. -->
  <div v-bind:key="this.$store.state.platform">
    <!-- CSV tasks -->
    <csv-training-frame
      v-if="Task.trainingInformation.dataType == 'csv'"
      v-bind:id="id"
      v-bind:task="task"
    />
    <!-- image tasks -->
    <image-training-frame
      v-else-if="Task.trainingInformation.dataType == 'image'"
      v-bind:id="id"
      v-bind:task="task"
    />
  </div>
</template>

<script>
import CsvTrainingFrame from "../building_frames/csv/CsvTrainingFrame.vue";
import ImageTrainingFrame from "../building_frames/image/ImageTrainingFrame.vue";

export default {
  name: "main-training-frame",
  props: {
    id: String,
    task: Object,
  },
  components: {
    CsvTrainingFrame,
    ImageTrainingFrame,
  },
};
</script>
