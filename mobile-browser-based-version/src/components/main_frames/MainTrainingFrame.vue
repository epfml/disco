<template>
  <!-- CSV tasks -->
  <keep-alive>
    <div v-if="Task.trainingInformation.dataType == 'csv'">
      <CsvTrainingFrame v-bind:Id="Id" v-bind:Task="Task" />
    </div>
  </keep-alive>

  <!-- image tasks -->
  <keep-alive>
    <div v-if="Task.trainingInformation.dataType == 'image'">
      <ImageTrainingFrame v-bind:Id="Id" v-bind:Task="Task" />
    </div>
  </keep-alive>
</template>

<script>
import CsvTrainingFrame from "../building_frames/CsvTrainingFrame";
import ImageTrainingFrame from "../building_frames/ImageTrainingFrame";

export default {
  name: "MainTrainingFrame",
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