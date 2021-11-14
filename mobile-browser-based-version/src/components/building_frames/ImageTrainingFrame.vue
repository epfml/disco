<template>
   <TrainingFrame
    :Id="Id"
    :Task="Task"
    :dataFormatInfoText="dataFormatInfoText"
    :dataExampleText="dataExampleText"
    :trainingManager="trainingManager"
    :trainingInformant="trainingInformant"
    :fileUploadManager="fileUploadManager"
    :joinTraining="joinTraining"
    :num_peers="num_peers"
    :nbrClasses="Task.trainingInformation.LABEL_LIST.length"
    
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
import tippy from 'tippy.js';
import { TrainingInformant } from '../../helpers/training_script/training_informant';
import { CommunicationManager } from '../../helpers/communication_script/communication_manager';
import { TrainingManager } from '../../helpers/training_script/training_manager';
import { checkData } from '../../helpers/data_validation_script/helpers-image-tasks';
import { FileUploadManager } from '../../helpers/data_validation_script/file_upload_manager';
import TrainingFrame from './containers/TrainingFrame'
import 'tippy.js/themes/light.css';

// manager for the training loop
var trainingManager = null;
export default {
  name: 'ImageTrainingFrame',
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      // variables for general informations
      modelName: null,
      DataFormatInfoText: '',
      DataExampleText: '',
      DataExample: null,
      DataExampleImage: '',
      // different task labels
      taskLabels: [],
      trainingManager: null,
      num_peers: 0,

      // manager that returns feedbacks when training
      trainingInformant: new TrainingInformant(
        10,
        this.Task.trainingInformation.modelId
      ),

      // manager for the file uploading process
      fileUploadManager: new FileUploadManager(
        this.Task.trainingInformation.LABEL_LIST.length,
        this
      ),

      // take care of communication processes
      communicationManager: new CommunicationManager(
        this.Task.trainingInformation.port,
        this.Task.taskId,
        this.$store.getters.password(this.Id)
      ), // TO DO: to modularize
    };
  },
  methods: {
   

    async joinTraining(distributed) {
      const filesElement = this.fileUploadManager.getFilesList();

      // Check that the user indeed gave a file
      if (filesElement.length == 0) {
        alert('Training aborted. No uploaded file given as input.');
      } else {
        this.$toast.success(
          `Thank you for your contribution. Image preprocessing has started`
        );
        setTimeout(this.$toast.clear, 30000);

        let status_validation = await checkData(
          filesElement,
          this.Task.trainingInformation
        );

        if (status_validation.accepted) {
          let processedData = await this.Task.dataPreprocessing(filesElement);

          this.$toast.success(
            `Image preprocessing has finished and training has started`
          );
          setTimeout(this.$toast.clear, 30000);

          await this.trainingManager.trainModel(distributed, processedData);
        } else {
          console.log('Invalid image input.');
          console.log(
            'Number of images with valid format: ' +
              status_validation.nr_accepted +
              ' out of ' +
              filesElement.length
          );
        }
      }
    },

    getImage(url) {
      if (url == '') {
        return null;
      }

      var images = require.context('../../../example_training_data/', false);
      return images(url);
    },

    
  },
  components: {
    TrainingFrame,
  },
  async mounted() {
    tippy('button', {
      theme: 'custom-dark',
      content: reference => reference.getAttribute('data-title'),
      onMount(instance) {
        instance.popperInstance.setOptions({
          placement: instance.reference.getAttribute('data-placement'),
        });
      },
    });

    window.setInterval(async () => {
      await this.communicationManager.updateReceivers();
      this.num_peers = this.communicationManager.receivers.length;
    }, 2000);
    // This method is called when the component is created
    this.$nextTick(async function() {
      // initialize information variables
      this.modelName = this.Task.trainingInformation.modelId;
      this.DataFormatInfoText = this.Task.displayInformation.dataFormatInformation;
      this.DataExampleText = this.Task.displayInformation.dataExampleText;
      this.DataExample = this.Task.displayInformation.dataExample;
      this.taskLabels = this.Task.trainingInformation.LABEL_LIST;
      this.DataExampleImage = this.Task.displayInformation.dataExampleImage;
      console.log('Mounting' + this.modelName);

      // initialize the training manager
      this.trainingManager = new TrainingManager(this.Task.trainingInformation);

      // initialize training informant
      this.trainingInformant.initializeCharts();

      // initialize communication manager
      this.communicationManager.initializeConnection(
        this.Task.trainingInformation.epoch,
        this
      );

      // initialize training manager
      this.trainingManager.initialization(
        this.communicationManager,
        this.trainingInformant,
        this
      );
    });
  },
  async unmounted() {
    // close the connection with the server
    this.communicationManager.disconect();
  },
};
</script>
