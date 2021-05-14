<template>
  <div
    class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen p-4 overflow-x-hidden overflow-y-auto"
  >
    <!-- Data Format Card -->
    <a id="overview-target">
      <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
        <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
          <!-- Card header -->
          <div
            class="flex items-center justify-between p-4 border-b dark:border-primary"
          >
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Data Format Information
            </h4>
            <div class="flex items-center">
              <span aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  class="bi bi-card-checklist w-7 h-7"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"
                  />
                  <path
                    d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0zM7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"
                  />
                </svg>
              </span>
            </div>
          </div>
          <!-- Descrition -->
          <div class="relative p-4 overflow-x-scroll">
            <span class="text-sm text-gray-500 dark:text-light">{{
              DataFormatInfoText
            }}</span>
          </div>
        </div>
      </div>
    </a>

    <!-- Data Example Card -->
    <a id="limitations-target">
      <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
        <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
          <!-- Card header -->
          <div
            class="flex items-center justify-between p-4 border-b dark:border-primary"
          >
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Data Example
            </h4>
            <div class="flex items-center">
              <span aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  class="bi bi-file-earmark-ruled w-7 h-7"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5v2zM3 12v-2h2v2H3zm0 1h2v2H4a1 1 0 0 1-1-1v-1zm3 2v-2h7v1a1 1 0 0 1-1 1H6zm7-3H6v-2h7v2z"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div class="relative p-4 overflow-x-scroll">
            <span class="text-sm text-gray-500 dark:text-light">{{
              DataExampleText
            }}</span>
          </div>

          <!-- Data Point Example -->
          <img src="../../../example_training_data/2_QAID_1.masked.reshaped.squared.224.png" alt="">
        </div>
      </div>
    </a>

    <!-- Upload File Card -->
    <div class="p-4 grid grid-cols-1 space-y-2 lg:gap-2">
      <div class="container mx-width lg h-full">
        <!-- Card header -->
        <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
          <div
            class="flex items-center justify-between p-4 border-b dark:border-primary"
          >
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Upload My Data
            </h4>
            <div class="flex items-center">
              <span aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  class="bi bi-cloud-upload w-7 h-7"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z"
                  />
                  <path
                    fill-rule="evenodd"
                    d="M7.646 4.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V14.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3z"
                  />
                </svg>
              </span>
            </div>
          </div>
        </div>

        <!-- Upload Images-->
        <div class="relative pb-4">
          <ImageUploadFrame
            v-for="label in task_labels"
            v-bind:key="label"
            :label="String(label)"
            :inputchangefunc="inputChange"
          />
        </div>
      </div>
    </div>

    <!-- Train Button -->
    <div class="flex items-center justify-center p-4">
      <button
        v-on:click="join_training(false)"
        type="button"
        class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
      >
        Train Alone
      </button>
      <button
        v-on:click="join_training(true)"
        type="button"
        class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
      >
        Train Distributed
      </button>
    </div>

    <!-- Training Board -->
    <div
      x-transition:enter="transition duration-300 ease-in-out"
      x-transition:enter-start="opacity-0"
      x-transition:enter-end="opacity-100"
      x-ref="trainingBoard"
      x-show="isTraining"
    >
      <!-- Validation Accuracy users chart -->
      <div class="grid grid-cols-2 p-4 space-x-4 lg:gap-2">
        <div class="col-span-1 bg-white rounded-md dark:bg-darker">
          <!-- Card header -->
          <div class="p-4 border-b dark:border-primary">
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Validation Accuracy of the Model
            </h4>
          </div>
          <p class="p-4">
            <span
              class="text-2xl font-medium text-gray-500 dark:text-light"
              id="val_accuracy"
              >0</span
            >
            <span class="text-sm font-medium text-gray-500 dark:text-primary"
              >% of validation accuracy</span
            >
          </p>
          <!-- Chart -->
          <div class="relative p-4">
            <canvas id="valAccuracyChart"></canvas>
          </div>
        </div>

        <div class="col-span-1 bg-white rounded-md dark:bg-darker">
          <!-- Card header -->
          <div class="p-4 border-b dark:border-primary">
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Training Accuracy of the Model
            </h4>
          </div>
          <p class="p-4">
            <span
              class="text-2xl font-medium text-gray-500 dark:text-light"
              id="accuracy"
              >0</span
            >
            <span class="text-sm font-medium text-gray-500 dark:text-primary"
              >% of training accuracy</span
            >
          </p>
          <!-- Chart -->
          <div class="relative p-4">
            <canvas id="accuracyChart"></canvas>
          </div>
        </div>
      </div>
    </div>
    <button
        id="test-model-button"
        v-on:click="goToTesting()"
        type="button"
        class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
      >
        Go Test
    </button>
  </div>
</template>

<script>
import ImageUploadFrame from "../ImageUploadFrame";
import * as tf from "@tensorflow/tfjs";
import * as Chart from "chart.js";
import {training, training_distributed} from "../../helpers/training-script.js"
import {
  display_informations,
  training_information,
  data_preprocessing,
  create_model
} from "./lus-covid-script.js"; // <-- Change import here 

import {get_serialized_model, store_serialized_model} from "../../helpers/indexedDB_script" //todo check this

var model = null;

var model_compile_data = {
  optimizer: "rmsprop",
  loss: "binaryCrossentropy",
  metrics: ["accuracy"],
};
var model_train_data = {
  epochs: 5,
};

export default {
  data() {
    return {
      // Variables for general informations
      model_name: "",
      DataFormatInfoText: "",
      DataExampleText: "",

      // Variabldes for feed-backs when training
      valAccuracyChart: null,
      accuracyChart: null,
      val_accuracy: null,
      accuracy: null,

      // Variables for communications
      receivers: [],
      epoch: 0,
      username: null,
      threshold: null,

      // Different Task Labels
      task_labels: ["COVID-Positive", "COVID-Negative"],

      // Feed Back Training Components
      FILES: {},
    };
  },
  methods: {
    addFile: function (file, label) {
      const isImage = file.type.match("image.*"),
        objectURL = URL.createObjectURL(file);
      this.FILES[objectURL] = {label:label, name: file.name};
    },

    inputChange: function (e, label) {
      console.log("Adding file");
      let count = 0
      for (const file of e.target.files) {
        this.addFile(file, label);
        count++
      }
      console.log( count, "Files Added");
    },

    goToTesting() {
      this.$router.push({ path: "/MNIST-model/testing" });
    },
    csvToArray(str, delimiter = ",") {

      // slice from \n index + 1 to the end of the text
      // use split to create an array of each csv value row
      const rows = str.slice(0).split("\n");

      const arr = rows.map(function (row) {
          return row.split(delimiter).map(value => parseFloat(value));
        })
      return arr
    },

    /**
     * Creates the tf.model
     * TO DO: fetch model from local storage
     * @returns Returns a tf.model for training
     */
    async get_model() {
      return this.model
    },

    async create_model(){
      return create_model()
    },

    async join_training(distributed){

      // Notification Start Training
      this.$toast.success(`Thank you for your contribution. Image preprocessing has started`);
      setTimeout(this.$toast.clear, 30000)

      const batchSize = 2;

      const preprocessed_data = await data_preprocessing(this.FILES)

      const Xtrain = preprocessed_data.xs
      const ytrain = preprocessed_data.labels

      this.$toast.success(`Image preprocessing has finished and training has started`);
      setTimeout(this.$toast.clear, 30000)

      const validationSplit = 0.2;
    
      const trainEpochs = 10

      if (!distributed) {
        await training(
          model,
          this.model_name,
          Xtrain,
          ytrain,
          batchSize,
          validationSplit,
          trainEpochs,
          this.updateUI
        );
      } else {
        await training_distributed(
          model,
          this.model_name,
          Xtrain,
          ytrain,
          model_train_data,
          batchSize,
          validationSplit,
          model_compile_data,
          this.onEpochBegin,
          this.onEpochEnd
        );
      }

      // Notification End Training
      this.$toast.success(`LUS-COVID model has finished training!`);
      setTimeout(this.$toast.clear, 30000)
    },

    async updateUI(epoch, _accuracy, validation_accuracy){
      this.updateAccuracy(epoch, _accuracy)
      this.updateValidationAccuracy(epoch, validation_accuracy)
    },

    /**
     * Method to update tha accuracy chart when training
     * @param {Number} epoch The epoch number of the current training
     * @param {Number} _accuracy The accuracy achieved by the model in the given epoch
     */
    async updateAccuracy(epoch, _accuracy) {
      this.accuracyChart.data.datasets[0].data.push(_accuracy);
      this.accuracyChart.data.datasets[0].data.splice(0, 1);
      this.accuracyChart.data.labels.push(epoch);
      this.accuracyChart.data.labels.splice(0, 1);
      await this.accuracyChart.update();
      this.accuracy.innerText = _accuracy;
    },

    /**
     * Method to update tha validation accuracy chart when training
     * @param {Number} epoch The epoch number of the current training
     * @param {Number} _accuracy The validation accuracy achieved by the model in the given epoch
     */
    async updateValidationAccuracy(epoch, accuracy) {
      this.valAccuracyChart.data.datasets[0].data.push(accuracy);
      this.valAccuracyChart.data.datasets[0].data.splice(0, 1);
      this.valAccuracyChart.data.labels.push(epoch);
      this.valAccuracyChart.data.labels.splice(0, 1);
      await this.valAccuracyChart.update();
      this.val_accuracy.innerText = accuracy;
    },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function () {
      // Code that will run only after the
      // entire view has been rendered
      
      this.model_name = training_information.model_id;
      this.DataFormatInfoText = display_informations.dataFormatInformation;
      this.DataExampleText = display_informations.dataExampleText;
      this.DataExample = display_informations.dataExample

      // Create the model 
      model = create_model();
      const save_path = "localstorage://".concat(this.model_name);
      const saveResults = await model.save(save_path);
      const save_path_db = "indexeddb://".concat(this.model_name);
      await model.save(save_path_db);

      
      getModel(this.model_name).then((value) => {
        console.log(value)
        let model_info = value.model_info
        let model_data = value.model_data
        let toyName = "testModel"
        model_data.modelPath = toyName
        model_info.modelPath = toyName
        setModel(toyName, model_info, model_data).then(async () => {
          model = await tf.loadLayersModel('indexeddb://'.concat(toyName))
        })
      })
      

      /**
       * #######################################
       * CODE TO HANDLE CREATION OF CHARTS FEEDBACKS
       * #######################################
       */

      /**
       * Returns the CSS colors graphs should be rendered in
       */
      const cssColors = (color) => {
        return getComputedStyle(document.documentElement).getPropertyValue(
          color
        );
      };

      /**
       * Returns the colors depending on user's choice graphs should be rendered in
       */
      const getColor = () => {
        return window.localStorage.getItem("color") ?? "cyan";
      };

      // Initilization of the color's constant
      // TO DO: add listeners to modify color when changement added
      const colors = {
        primary: cssColors(`--color-${getColor()}`),
        primaryLight: cssColors(`--color-${getColor()}-light`),
        primaryLighter: cssColors(`--color-${getColor()}-lighter`),
        primaryDark: cssColors(`--color-${getColor()}-dark`),
        primaryDarker: cssColors(`--color-${getColor()}-darker`),
      };

      // Initialization of validation accuracy constant
      this.val_accuracy = document.getElementById("val_accuracy");

      // Initialization of the validation accuracy chart
      this.valAccuracyChart = new Chart(
        document.getElementById("valAccuracyChart"),
        {
          type: "line",
          data: {
            labels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            datasets: [
              {
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                backgroundColor: colors.primary,
                borderWidth: 0,
                categoryPercentage: 1,
              },
            ],
          },
          options: {
            scales: {
              yAxes: [
                {
                  display: false,
                  gridLines: false,
                  // uncomment to stop chart auto scale
                  /*
                    ticks: {
                        min:0,
                        max:100
                    }*/
                },
              ],
              xAxes: [
                {
                  display: false,
                  gridLines: false,
                },
              ],
              ticks: {
                padding: 10,
              },
            },
            cornerRadius: 2,
            maintainAspectRatio: false,
            legend: {
              display: false,
            },
            tooltips: {
              prefix: "Validation Accuracy",
              bodySpacing: 4,
              footerSpacing: 4,
              hasIndicator: true,
              mode: "index",
              intersect: true,
            },
            hover: {
              mode: "nearest",
              intersect: true,
            },
          },
        }
      );

      // Initialization of the training accuracy constant
      this.accuracy = document.getElementById("accuracy");

      // Initialization of the training accuracy chart
      this.accuracyChart = new Chart(document.getElementById("accuracyChart"), {
        type: "line",
        data: {
          labels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          datasets: [
            {
              data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              backgroundColor: colors.primary,
              borderWidth: 0,
              categoryPercentage: 1,
            },
          ],
        },
        options: {
          scales: {
            yAxes: [
              {
                display: false,
                gridLines: false,
                // uncomment to stop chart auto scale
                /*
                    ticks: {
                        min:0,
                        max:100
                    }*/
              },
            ],
            xAxes: [
              {
                display: false,
                gridLines: false,
              },
            ],
            ticks: {
              padding: 10,
            },
          },
          cornerRadius: 2,
          maintainAspectRatio: false,
          legend: {
            display: false,
          },
          tooltips: {
            prefix: "Validation Accuracy",
            bodySpacing: 4,
            footerSpacing: 4,
            hasIndicator: true,
            mode: "index",
            intersect: true,
          },
          hover: {
            mode: "nearest",
            intersect: true,
          },
        },
      });
    });
  },
  components: {
    ImageUploadFrame,
  },
};
</script>