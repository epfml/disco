<template>
  <!-- CSV tasks -->
  <!--TODO-->
  <!-- image tasks -->
  <div v-if="Task.trainingInformation.dataType == 'image'">
    <ImageTestingFrame v-bind:Id="Id" v-bind:Task="Task" />
  </div>
  <div v-if="Task.trainingInformation.dataType == 'csv'">
    <CsvTestingFrame v-bind:Id="Id" v-bind:Task="Task" />
  </div>
</template>

<script>
import ImageTestingFrame from '../building_frames/image/ImageTestingFrame';
import CsvTestingFrame from '../building_frames/csv/CsvTestingFrame';

export default {
  name: 'MainTestingFrame',
  props: {
    Id: String,
    Task: Object,
  },
  components: {
    ImageTestingFrame,
    CsvTestingFrame,
  },
  async activated() {
    this.$emit("opened-testing");
  },
};
</script>
