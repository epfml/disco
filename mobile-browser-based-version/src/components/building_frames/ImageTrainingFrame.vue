<template>
   <TrainingFrame
    :Id="Id"
    :Task="Task"
   
    :dataPreprocessing="dataPreprocessing"
    :num_peers="num_peers"
    :nbrClasses="Task.trainingInformation.LABEL_LIST.length"
    :precheckData="precheckData"
   >
      <template v-slot:dataExample>
          <!-- Data Point Example -->
          <div class="flex object-center">
            <img
              class="object-center"
              :src="getImage(DataExampleImage)"
              v-bind:alt="DataExampleImage"
            /><img />
          </div>
      </template>
      <template v-slot:extra></template>
   </TrainingFrame>
</template>

<script>
import { checkData } from '../../helpers/data_validation_script/helpers-image-tasks';
import TrainingFrame from './containers/TrainingFrame'

export default {
  name: 'ImageTrainingFrame',
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      // variables for general informations
      DataExampleImage: '',
      // different task labels
      taskLabels: [],
    };
  },
  methods: {
    getImage(url) {
      if (url == '') {
        return null;
      }
      var images = require.context('../../../example_training_data/', false);
      return images(url);
    },
    async dataPreprocessing(filesElement , callback){
      let processedData = this.Task.dataPreprocessing(filesElement);
      await callback(processedData)
    },
    precheckData(filesElement,info) {
      return checkData(filesElement,info);
    }
  },
  components: {
    TrainingFrame,
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function() {
      // initialize information variables
      this.taskLabels = this.Task.trainingInformation.LABEL_LIST;
      this.DataExampleImage = this.Task.displayInformation.dataExampleImage;    
    });
  },
};
</script>
