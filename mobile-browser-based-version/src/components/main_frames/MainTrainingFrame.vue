<template>
  <!-- CSV tasks -->
  <csv-training-frame
    v-if="Task.trainingInformation.dataType == 'csv'"
    v-bind:Id="Id"
    v-bind:Task="Task"
  />
  <!-- image tasks -->
  <image-training-frame
    v-else-if="Task.trainingInformation.dataType == 'image'"
    v-bind:Id="Id"
    v-bind:Task="Task"
  />
</template>

<script>
import CsvTrainingFrame from '../building_frames/csv/CsvTrainingFrame';
import ImageTrainingFrame from '../building_frames/image/ImageTrainingFrame';

export default {
  name: 'main-training-frame',
  props: {
    Id: String,
    Task: Object,
  },
  components: {
    CsvTrainingFrame,
    ImageTrainingFrame,
  },
};
</script>
