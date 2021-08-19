<template>
  <!-- CSV tasks -->
  <!--TODO-->

  <!-- image tasks -->
  <div v-if="Task.trainingInformation.dataType == 'image'">
    <ImageTestingFrame v-bind:Id="Id" v-bind:Task="Task" />
  </div>
</template>

<script>
import ImageTestingFrame from '../building_frames/ImageTestingFrame';

export default {
  name: 'MainTestingFrame',
  props: {
    Id: String,
    Task: Object,
  },
  components: {
    ImageTestingFrame,
  },
};
</script>
