<template>
  <training-frame
    :Id="Id"
    :Task="Task"
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
import { checkData } from '../../../helpers/data_validation/helpers_image_tasks';
import TrainingFrame from '../containers/TrainingFrame';

export default {
  name: 'ImageTrainingFrame',
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      // variables for general informations
      dataExampleImage: '',
      dataExample: null,
      // different task labels
      taskLabels: [],
    };
  },
  methods: {
    getImage(url) {
      if (url == '') {
        return null;
      }
      var images = require.context('../../../../example_training_data/', false);
      return images(url);
    },
    async dataPreprocessing(filesElement) {
      return new Promise((resolve, reject) => {
        let processedData = this.Task.dataPreprocessing(filesElement);
        resolve(processedData);
      });
    },
    precheckData(filesElement, info) {
      return checkData(filesElement, info);
    },
  },
  components: {
    TrainingFrame,
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function () {
      // initialize information variables
      this.dataExample = this.Task.displayInformation.dataExample;
      this.taskLabels = this.Task.trainingInformation.LABEL_LIST;
      this.dataExampleImage = this.Task.displayInformation.dataExampleImage;
    });
  },
};
</script>
