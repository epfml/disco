<template>
  <action-frame :Task="Task">
    <template v-slot:dataExample>
      <slot name="dataExample"></slot>
    </template>
    <template v-slot:action>
      <!-- Upload Training Data -->
      <div class="relative">
        <uploading-frame
          v-bind:Id="Id"
          v-bind:Task="Task"
          v-bind:fileUploadManager="fileUploadManager"
          v-if="fileUploadManager"
        />
      </div>

      <slot name="extra"></slot>

      <!-- Train Button -->
      <div class="flex items-center justify-center p-4">
        <div v-if="!isTraining">
          <custom-button v-on:click="joinTraining(false)" :center="true">Train Locally</custom-button>
          <custom-button
            v-on:click="joinTraining(true)"
            :center="true"
          >Train {{ this.$t('platform') }}</custom-button>
        </div>
        <div v-else>
          <custom-button
            v-on:click="stopTraining()"
            :center="true"
            color="bg-red-500"
          >Stop {{ trainingText }} Training</custom-button>
        </div>
      </div>
      <!-- Training Board -->
      <div>
        <training-information-frame
          v-bind:trainingInformant="trainingInformant"
          v-if="trainingInformant"
        />
      </div>

      <!-- Save the model button -->
      <icon-card
        header="Save the model"
        description="If you are satisifed with the performance of the model, don't
            forget to save the model by clicking on the button below. The next
            time you will load the application, you will be able to use your
            saved model."
      >
        <template v-slot:icon>
          <download />
        </template>
        <template v-slot:extra>
          <div class="flex items-center justify-center p-4">
            <!-- make it gray & unclickable if indexeddb is turned off -->
            <custom-button
              id="train-model-button"
              v-on:click="saveModel()"
              :center="true"
            >Save My model</custom-button>
          </div>
        </template>
      </icon-card>
      <!-- Test the model button -->
      <icon-card
        header="Test the model"
        description="Once you have finished training your model it might be a great idea
            to go test it."
      >
        <template v-slot:icon>
          <download />
        </template>
        <template v-slot:extra>
          <!-- Descrition -->
          <div class="relative p-4 overflow-x-hidden">
            <span style="white-space: pre-line" class="text-sm text-gray-500 dark:text-light"></span>
          </div>
          <div class="flex items-center justify-center p-4">
            <custom-button
              id="train-model-button"
              v-on:click="goToTesting()"
              :center="true"
            >Test the model</custom-button>
          </div>
        </template>
      </icon-card>
    </template>
  </action-frame>
</template>

<script lang="ts">
import UploadingFrame from '../upload/UploadingFrame.vue';
import TrainingInformationFrame from '../TrainingInformationFrame.vue';
import ActionFrame from './ActionFrame.vue';
import IconCard from '../../containers/IconCard.vue';
import CustomButton from '../../simple/CustomButton.vue';
import Download from '../../../assets/svg/Download.vue';
import { TrainingInformant } from '../../../helpers/training/decentralised/training_informant';
import { getClient } from '../../../helpers/communication/helpers';
import { TrainingManager } from '../../../helpers/training/training_manager';
import { FileUploadManager } from '../../../helpers/data_validation/file_upload_manager';
import { saveWorkingModel } from '../../../helpers/memory/helpers';
import { mapState } from 'vuex';
export default {
  name: 'TrainingFrame',
  props: {
    Id: String,
    Task: Object,
    dataPreprocessing: Function,
    precheckData: Function,
    nbrClasses: Number,
  },
  components: {
    UploadingFrame,
    TrainingInformationFrame,
    ActionFrame,
    IconCard,
    CustomButton,
    Download,
  },
  computed: {
    ...mapState(['useIndexedDB']),
    trainingText() {
      return this.distributedTraining ? 'Distributed' : 'Local';
    },
  },
  watch: {
    useIndexedDB(newValue) {
      this.trainingManager.setIndexedDB(newValue);
    },
  },
  data() {
    return {
      isConnected: false,
      isTraining: false,
      distributedTraining: false,
      // Delivers training feedback to the user
      trainingInformant: new TrainingInformant(10, this.Task.taskID),
      // Handles the file uploading process
      fileUploadManager: new FileUploadManager(this.nbrClasses, this),
    };
  },
  methods: {
    async connectClientToServer() {
      this.isConnected = await this.client.connect();
      if (this.isConnected) {
        this.$toast.success(
          'Succesfully connected to server. Distributed training available.'
        );
      } else {
        console.log('Error in connecting');
        this.$toast.error(
          'Failed to connect to server. Fallback to training alone.'
        );
      }
      setTimeout(this.$toast.clear, 30000);
    },
    goToTesting() {
      this.$router.push({
        path: 'testing',
      });
    },
    async stopTraining() {
      this.trainingManager.stopTraining();
      if (this.isConnected) {
        await this.client.disconnect();
        this.isConnected = false;
      }
      this.$toast.success('Training was successfully interrupted.');
      setTimeout(this.$toast.clear, 30000);
      this.isTraining = false;
    },
    async saveModel() {
      if (this.useIndexedDB) {
        await saveWorkingModel(
          this.Task.taskID,
          this.Task.trainingInformation.modelID
        );
        this.$toast.success(
          `The current ${this.Task.displayInformation.taskTitle} model has been saved.`
        );
      } else {
        this.$toast.error(
          'The model library is currently turned off. See settings for more information'
        );
      }
      setTimeout(this.$toast.clear, 30000);
    },
    async joinTraining(distributed) {
      if (distributed && !this.isConnected) {
        await this.connectClientToServer();
        if (!this.isConnected) {
          distributed = false;
        }
      }
      this.distributedTraining = distributed;
      const nbrFiles = this.fileUploadManager.numberOfFiles();
      console.log('***********************');
      console.log(nbrFiles);
      console.log(this.nbrClasses);
      console.log(this.fileUploadManager.getFilesList());
      console.log('***********************');
      // Check that the user indeed gave a file
      if (nbrFiles == 0) {
        this.$toast.error(`Training aborted. No uploaded file given as input.`);
        setTimeout(this.$toast.clear, 30000);
      } else {
        // Assume we only read the first file
        this.$toast.success(
          `Thank you for your contribution. Data preprocessing has started`
        );
        setTimeout(this.$toast.clear, 30000);
        console.log(this.fileUploadManager);
        const filesElement =
          nbrFiles > 1
            ? this.fileUploadManager.getFilesList()
            : this.fileUploadManager.getFirstFile();
        console.log('***********************');
        console.log(filesElement);
        var statusValidation = { accepted: true };
        if (this.precheckData) {
          // Data checking is optional
          statusValidation = await this.precheckData(
            filesElement,
            this.Task.trainingInformation
          );
        }
        if (statusValidation.accepted) {
          // Preprocess the uploaded dataset and start training
          let processedDataset = await this.dataPreprocessing(filesElement);
          this.$toast.success(
            `Data preprocessing has finished and training has started`
          );
          setTimeout(this.$toast.clear, 30000);
          this.trainingManager.trainModel(processedDataset, distributed);
          this.isTraining = true;
        } else {
          this.$toast.error(
            `Invalid input format: Number of data points with valid format: ${statusValidation.nr_accepted} out of ${nbrFiles}`
          );
          setTimeout(this.$toast.clear, 30000);
        }
      }
    },
  },
  created() {
    // Create the client to take care of communication processes
    this.client = getClient(
      this.$store.getters.platform,
      this.Task,
      this.$store.getters.password(this.Id)
    );
    // Disconnect from the centralized server on page close
    window.addEventListener('beforeunload', () => {
      this.client.disconnect();
    });
    // Create the training manager
    this.trainingManager = new TrainingManager(
      this.Task,
      this.client,
      this.trainingInformant,
      this.useIndexedDB
    );
  },
  unmounted() {
    this.client.disconnect();
  },
};
</script>
