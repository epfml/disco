<template>
  <training-frame
    :id="id"
    :task="task"
    :dataPreprocessing="dataPreprocessing"
    :nbrClasses="Task.trainingInformation.LABEL_LIST.length"
    :precheckData="precheckData"
  >
    <template v-slot:dataExample>
      <!-- Data Point Example -->
      <div class="flex object-center">
        <img
          class="object-center"
          :src="getImage(dataExampleImage)"
          v-bind:alt="dataExampleImage"
        /><img />
      </div>
    </template>
    <template v-slot:extra></template>
  </training-frame>
</template>

<script>
import { checkData } from "../../../helpers/data_validation/helpers_image_tasks.js";
import TrainingFrame from "../containers/TrainingFrame.vue";

export default {
  name: "image-training-frame",
  props: {
    id: String,
    task: Object,
  },
  components: {
    TrainingFrame,
  },
  data() {
    return {
      // variables for general informations
      dataExampleImage: "",
      dataExample: null,
      // different task labels
      taskLabels: [],
    };
  },
  methods: {
    getImage(url) {
      if (url == "") {
        return null;
      }
      var images = require.context("../../../../example_training_data/", false);
      return images(url);
    },
    /**
     * Checks if the data is in the correct format (accepted: True / False) and turns the input data into Xtrain and ytain objects.
     */
    async dataPreprocessing(filesElement) {
      return new Promise((resolve, reject) => {
        let processedData = this.task.dataPreprocessing(filesElement);
        resolve(processedData);
      });
    },
    precheckData(filesElement, info) {
      return checkData(filesElement, info);
    },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function () {
      // initialize information variables
      this.dataExample = this.task.displayInformation.dataExample;
      this.taskLabels = this.task.trainingInformation.LABEL_LIST;
      this.dataExampleImage = this.task.displayInformation.dataExampleImage;
    });
  },
};
</script>
