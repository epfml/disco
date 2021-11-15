<template>
  <div
    class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen p-4 overflow-x-hidden overflow-y-auto"
  >
    <!-- Data Format Card -->
    <a id="overview-target">
      <icon-card
        header="Data Format Information"
        :description="this.dataFormatInfoText"
      >
        <template v-slot:icon><check-list /></template>
      </icon-card>
    </a>

    <!-- Data Example Card -->
    <a id="limitations-target">
      <icon-card header="Data Example" :description="dataExampleText">
        <template v-slot:icon><file-earmark-ruled /></template>
        <!-- Data Point Example -->
        <template v-slot:extra>
          <slot name="dataExample"></slot>
        </template>
      </icon-card>
    </a>

    <!-- Upload CSV-->
    <div class="relative">
      <UploadingFrame
        v-bind:Id="Id"
        v-bind:Task="Task"
        v-bind:fileUploadManager="fileUploadManager"
        v-if="fileUploadManager"
      />
    </div>

    <slot name="extra"></slot>

    <!-- Train Button -->
    <div class="flex items-center justify-center p-4">
      <customButton v-on:click="joinTraining(false)" :center="true">
        Train Alone
      </customButton>
      <customButton v-on:click="joinTraining(true)" :center="true">
        Train Distributed
      </customButton>
    </div>

    <div class="flex items-center justify-center p-4">
      Currently {{ num_peers }} peers in the network
    </div>
    <!-- Training Board -->
    <div>
      <TrainingInformationFrame
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
      <template v-slot:icon><download /></template>
      <template v-slot:extra
        ><div class="flex items-center justify-center p-4">
          <customButton
            id="train-model-button"
            v-on:click="saveModel()"
            :center="true"
          >
            Save My model
          </customButton>
        </div></template
      >
    </icon-card>
    <!-- Test the model button -->
    <icon-card
      header="Test the model"
      description="Once you have finished training your model it might be a great idea
            to go test it."
    >
      <template v-slot:icon><download /></template>
      <template v-slot:extra>
        <!-- Descrition -->
        <div class="relative p-4 overflow-x-scroll">
          <span
            style="white-space: pre-line"
            class="text-sm text-gray-500 dark:text-light"
          >
          </span>
        </div>
        <div class="flex items-center justify-center p-4">
          <customButton
            id="train-model-button"
            v-on:click="goToTesting()"
            :center="true"
          >
            Test the model
          </customButton>
        </div>
      </template>
    </icon-card>
  </div>
</template>

<script>
import UploadingFrame from "../UploadingFrame";
import TrainingInformationFrame from "../TrainingInformationFrame";
import IconCard from "../../containers/IconCard";
import CheckList from "../../../assets/svg/CheckList";
import FileEarmarkRuled from "../../../assets/svg/FileEarmarkRuled";
import CustomButton from "../../simple/CustomButton";
import Download from "../../../assets/svg/Download.vue";
import { TrainingInformant } from "../../../helpers/training_script/training_informant";
import { CommunicationManager } from "../../../helpers/communication_script/communication_manager";
import { TrainingManager } from "../../../helpers/training_script/training_manager";
import { FileUploadManager } from "../../../helpers/data_validation_script/file_upload_manager";
import "tippy.js/themes/light.css";

export default {
  name: "TrainingFrame",
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
    IconCard,
    CheckList,
    FileEarmarkRuled,
    CustomButton,
    Download,
  },
  data() {
    return {
      // variables for general informations
      modelName: null,
      DataFormatInfoText: "",
      DataExampleText: "",
      DataExample: null,
      // assist with the training loop
      trainingManager: null,
      num_peers: 0,

      // manager that returns feedbacks when training
      trainingInformant: new TrainingInformant(
        10,
        this.Task.trainingInformation.modelId
      ),

      // manager for the file uploading process
      fileUploadManager: new FileUploadManager(this.nbrClasses, this),

      // take care of communication processes
      communicationManager: new CommunicationManager(
        this.Task.trainingInformation.port,
        this.Task.taskId,
        this.$store.getters.password(this.Id)
      ), // TO DO: to modularize
    };
  },
  methods: {
    goToTesting() {
      this.$router.push({
        path: "testing",
      });
    },
    saveModel() {
      this.trainingManager.saveModel();
    },
    async joinTraining(distributed) {
      const nbrFiles = this.fileUploadManager.numberOfFiles();

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
        var status_validation = { accepted: true };
        if (this.precheckData) {
          status_validation = await this.precheckData(
            filesElement,
            this.Task.trainingInformation
          );
        }
        if (!status_validation.accepted) {
          // print error message
          console.log("Invalid input format.");
          console.log(
            `Number of data points with valid format: ${status_validation.nr_accepted} out of ${filesElement.length}`
          );
        } else {
          // preprocess data
          await this.dataPreprocessing(filesElement, (processedData) => {
            this.$toast.success(
              `Data preprocessing has finished and training has started`
            );
            setTimeout(this.$toast.clear, 30000);
            this.trainingManager.trainModel(distributed, processedData);
          });
        }
      }
    },
  },
  async mounted() {
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
      //this.taskLabels = this.Task.trainingInformation.LABEL_LIST;
      //this.DataExampleImage = this.Task.displayInformation.dataExampleImage;
      console.log(`Mounting ${this.modelName}`);

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
