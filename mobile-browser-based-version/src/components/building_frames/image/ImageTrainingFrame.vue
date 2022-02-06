<template>
  <training-frame :id="id" :task="task">
    <template v-slot:dataExample>
      <!-- Data Point Example -->
      <div class="flex object-center">
        <img
          class="object-center"
          :src="
            helper.getExampleImage(task.displayInformation.dataExampleImage)
          "
          v-bind:alt="task.displayInformation.dataExampleImage"
        /><img />
      </div>
    </template>
    <template v-slot:extra></template>
  </training-frame>
</template>

<script>
import TrainingFrame from '../containers/TrainingFrame.vue';
import { ImageTaskHelper } from '../../../helpers/task_definition/image/helper';

export default {
  name: 'image-training-frame',
  props: {
    id: String,
    task: Object,
  },
  components: {
    TrainingFrame,
  },
  data() {
    return {
      helper: new ImageTaskHelper(this.task),
    };
  },
};
</script>
