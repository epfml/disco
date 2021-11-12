<template>
  <div
    class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen p-4 overflow-x-hidden overflow-y-auto"
  >
    <!-- Data Format Card -->
    <a id="overview-target">
      <icon-card
        header="Data Format Information"
        :description="dataFormatInfoText"
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
          <div class="relative p-4 overflow-x-scroll">
            <table class="table-auto">
              <thead>
                <tr>
                  <th
                    v-for="example in dataExample"
                    :key="example"
                    class="px-4 py-2 text-emerald-600"
                  >
                    {{ example.columnName }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    v-for="example in dataExample"
                    :key="example"
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    {{ example.columnData }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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

    <!-- Modification of Header Card -->
    <icon-card
      header="Map My Data"
      description="If the header of the file that you've uploaded differs from the one shown in example, you can map the expected header to your header format bellow."
    >
      <template v-slot:icon><bezier-2 /></template>
      <template v-slot:extra>
        <!-- Display all the possible headers -->
        <div id="mapHeader">
          <ul class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 xl:grid-cols-4">
            <li
              class="border-gray-400"
              v-for="header in headers"
              :key="header.id"
            >
              <div
                class="select-none p-2 transition duration-500 ease-in-out transform hover:-translate-y-2 rounded-2xl border-2 p-6 hover:shadow-2xl border-primary-dark"
              >
                <div class="grid grid-cols-3 items-center p-2">
                  <div class="pl-1">
                    <div class="font-medium">
                      <div class="flex flex-row justify-start">
                        {{ header.id }}
                      </div>
                    </div>
                  </div>
                  <div>
                    &larr;
                  </div>
                  <div class="mb-3 pt-0">
                    <input
                      type="text"
                      v-model="header.userHeader"
                      placeholder="Enter your header"
                      class="p-1 placeholder-gray-400 text-gray-700 dark:text-white relative bg-white dark:bg-dark rounded text-sm shadow outline-none focus:outline-none focus:shadow-outline w-full"
                    />
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </template>
    </icon-card>

    <!-- Train Button -->
    <div class="flex items-center justify-center p-4">
      <customButton v-on:click="joinTraining(false)" :center="true">
        Train Alone
      </customButton>
      <customButton v-on:click="joinTraining(true)" :center="true">
        Train Distributed
      </customButton>
    </div>

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
  </div>
</template>

<script>
import { mapState } from "vuex";
import { TrainingInformant } from "../../helpers/training_script/training_informant";
import { CommunicationManager } from "../../helpers/communication_script/communication_manager";
import { TrainingManager } from "../../helpers/training_script/training_manager";
import { FileUploadManager } from "../../helpers/data_validation_script/file_upload_manager";
import UploadingFrame from "./UploadingFrame";
import TrainingInformationFrame from "./TrainingInformationFrame";
import * as tf from "@tensorflow/tfjs";
import IconCard from "../containers/IconCard";
import CheckList from "../../assets/svg/CheckList";
import FileEarmarkRuled from "../../assets/svg/FileEarmarkRuled";
import Bezier2 from "../../assets/svg/Bezier2";
import CustomButton from "../simple/CustomButton";
import Download from '../../assets/svg/Download.vue';

export default {
  name: "CsvTrainingFrame",
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      // variables for general informations
      modelName: null,
      dataFormatInfoText: "",
      dataExampleText: "",
      dataExample: null,
      // headers related to training task of containing item of the form {id: "", userHeader: ""}
      headers: [],

      // returns feedbacks when training
      trainingInformant: new TrainingInformant(
        10,
        this.Task.trainingInformation.modelId
      ),

      // takes care of uploading file process
      fileUploadManager: new FileUploadManager(1, this),

      // assist with the training loop
      trainingManager: null,

      // take care of communication processes
      communicationManager: new CommunicationManager(
        this.Task.trainingInformation.port,
        this.Task.taskId,
        this.$store.getters.password(this.Id)
      ), // TO DO: to modularize
    };
  },

  methods: {
    saveModel() {
      this.trainingManager.saveModel();
    },
    async joinTraining(distributed) {
      const nbrFiles = this.fileUploadManager.numberOfFiles();

      // Check that the user indeed gave a file
      if (nbrFiles == 0) {
        alert("Training aborted. No uploaded file given as input.");
      } else {
        // Assume we only read the first file
        let file = this.fileUploadManager.getFirstFile();
        console.log(this.fileUploadManager);

        let reader = new FileReader();
        reader.onload = async (e) => {
          // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
          var processedData = await this.Task.dataPreprocessing(
            e,
            this.headers
          );
          await this.trainingManager.trainModel(distributed, processedData);
        };
        reader.readAsText(file);
      }
    },
  },
  components: {
    UploadingFrame,
    TrainingInformationFrame,
    IconCard,
    CheckList,
    FileEarmarkRuled,
    Bezier2,
    CustomButto
    Downloadn,
  },

  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function() {
      // initialize information variables
      this.modelName = this.Task.trainingInformation.modelId;

      console.log("Mounting" + this.modelName);

      this.dataFormatInfoText = this.Task.displayInformation.dataFormatInformation;
      this.dataExampleText = this.Task.displayInformation.dataExampleText;
      this.Task.displayInformation.headers.forEach((item) => {
        this.headers.push({ id: item, userHeader: item });
      });
      this.dataExample = this.Task.displayInformation.dataExample;

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
      await this.trainingManager.initialization(
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
