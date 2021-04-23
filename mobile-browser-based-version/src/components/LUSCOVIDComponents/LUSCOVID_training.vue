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
          <div class="relative p-4 overflow-x-scroll">
            <table class="table-auto">
              <thead>
                <tr>
                  <th class="px-4 py-2 text-emerald-600">Title</th>
                  <th class="px-4 py-2 text-emerald-600">Author</th>
                  <th class="px-4 py-2 text-emerald-600">Views</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    Intro to CSS
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    Adam
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    858
                  </td>
                </tr>
                <tr class="bg-emerald-200">
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    A Long and Winding Tour of the History of UI Frameworks and
                    Tools and the Impact on Design
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    Adam
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    112
                  </td>
                </tr>
                <tr>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    Intro to JavaScript
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    Chris
                  </td>
                  <td
                    class="border border-emerald-500 px-4 py-2 text-emerald-600 font-medium"
                  >
                    1,280
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
        v-on:click="join_training()"
        type="button"
        class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
      >
        Train
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
    <!-- Upload File Data Template -->
    <template id="file-template">
      <li class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
        <article
          tabindex="0"
          class="group w-full h-full rounded-md focus:outline-none focus:shadow-outline elative bg-gray-100 cursor-pointer relative shadow-sm"
        >
          <img
            alt="upload preview"
            class="img-preview hidden w-full h-full sticky object-cover rounded-md bg-fixed"
          />

          <section
            class="py-2 px-3 flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0"
          >
            <h1 class="flex-1 group-hover:text-blue-800"></h1>
            <div class="flex">
              <span class="p-1 text-blue-800">
                <i>
                  <svg
                    class="fill-current w-4 h-4 ml-auto pt-1"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M15 2v5h5v15h-16v-20h11zm1-2h-14v24h20v-18l-6-6z"
                    />
                  </svg>
                </i>
              </span>
              <p class="p-1 size text-xs text-gray-700"></p>
              <button
                class="delete ml-auto focus:outline-none hover:bg-gray-300 p-1 rounded-md text-gray-800"
              >
                <svg
                  class="pointer-events-none fill-current w-4 h-4 ml-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    class="pointer-events-none"
                    d="M3 6l3 18h12l3-18h-18zm19-4v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z"
                  />
                </svg>
              </button>
            </div>
          </section>
        </article>
      </li>
    </template>

    <!-- Upload Image Data Template-->
    <template id="image-template">
      <li class="block p-1 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 xl:w-1/8 h-24">
        <article
          tabindex="0"
          class="group hasImage w-full h-full rounded-md focus:outline-none focus:shadow-outline bg-gray-100 cursor-pointer relative text-transparent hover:text-white shadow-sm"
        >
          <img
            alt="upload preview"
            class="img-preview w-full h-full sticky object-cover rounded-md bg-fixed"
          />

          <section
            class="flex flex-col rounded-md text-xs break-words w-full h-full z-20 absolute top-0 py-2 px-3"
          >
            <h1 class="flex-1"></h1>
            <div class="flex">
              <span class="p-1">
                <i>
                  <svg
                    class="fill-current w-4 h-4 ml-auto pt-"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M5 8.5c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5c0 .829-.672 1.5-1.5 1.5s-1.5-.671-1.5-1.5zm9 .5l-2.519 4-2.481-1.96-4 5.96h14l-5-8zm8-4v14h-20v-14h20zm2-2h-24v18h24v-18z"
                    />
                  </svg>
                </i>
              </span>

              <p class="p-1 size text-xs"></p>
              <button
                class="delete ml-auto focus:outline-none hover:bg-gray-300 p-1 rounded-md"
              >
                <svg
                  class="pointer-events-none fill-current w-4 h-4 ml-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    class="pointer-events-none"
                    d="M3 6l3 18h12l3-18h-18zm19-4v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z"
                  />
                </svg>
              </button>
            </div>
          </section>
        </article>
      </li>
    </template>
  </div>
</template>


<script>
import ImageUploadFrame from "../ImageUploadFrame";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet"
import {categoricalCrossentropy} from '@tensorflow/tfjs-layers/dist/exports_metrics';
import * as Chart from "chart.js";
import * as d3 from "d3";
import {training, training_distributed} from "../../helpers/training-script.js"
import data_preprocessing from "../../helpers/lus-covid-deepchest-helper.js"
import createResnetModel from "../../helpers/lus-covid-resnet-helper"
import data_preprocessing_resnet from "../../helpers/lus-covid-preprocessing-resnet-helper"


var model = null;
export default {
  data() {
    return {
      title: "mnist-training",
      DataFormatInfoText:
        "Verum ad istam omnem orationem brevis est defensio. Nam quoad aetas M. Caeli dare potuit isti suspicioni locum, fuit primum ipsius pudore, deinde etiam patris diligentia disciplinaque munita. Qui ut huic virilem togam deditšnihil dicam hoc loco de me; tantum sit, quantum vos existimatis; hoc dicam, hunc a patre continuo ad me esse deductum; nemo hunc M. Caelium in illo aetatis flore vidit nisi aut cum patre aut mecum aut in M. Crassi castissima domo, cum artibus honestissimis erudiretur.",
      DataExampleText:
        "Verum ad istam omnem orationem brevis est defensio. Nam quoad aetas M. Caeli dare potuit isti suspicioni locum, fuit primum ipsius pudore, deinde etiam patris diligentia disciplinaque munita. Qui ut huic virilem togam deditšnihil dicam hoc loco de me; tantum sit, quantum vos existimatis; hoc dicam, hunc a patre continuo ad me esse deductum; nemo hunc M. Caelium in illo aetatis flore vidit nisi aut cum patre aut mecum aut in M. Crassi castissima domo, cum artibus honestissimis erudiretur.",

      // Different Task Labels
      task_labels: ["COVID-Positive", "COVID-Negative"],

      // Feed Back Training Components
      valAccuracyChart: null,
      accuracyChart: null,
      val_accuracy: null,
      accuracy: null,
      model: null,
      FILES: {},
      model_name: "LUS-COVID_model"
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

    /**
     * Creates the tf.model
     * TO DO: fetch model from local storage
     * @returns Returns a tf.model for training
     */
    get_model() {
      if(!this.model){
        this.model = this.create_model()
      }
      return this.model
    },

    create_model(){
      //return this.createConvModel()
      //return this.createDeepChestModel()
      return createResnetModel()
    },
    async loadMobilenet(){
      console.log("loading mobilenet")
      const net = await mobilenet.load()
      console.log("mobilenet loaded")
    },
    async join_training(){
      const optimizer = 'rmsprop';

      // Notification Start Training
      this.$toast.success(`Thank you for your contribution. Training has started`);
      setTimeout(this.$toast.clear, 30000)

      const preprocessed_data = await data_preprocessing_resnet(this.FILES)

      const batchSize = 2;

      const validationSplit = 0.2;
    
      const trainEpochs = 100


      await training(model, this.model_name, preprocessed_data.xs, preprocessed_data.labels, batchSize, validationSplit, trainEpochs, this.updateUI)
      
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

    async createDeepChestModel(){
      let new_model = tf.sequential();
    
      new_model.add(tf.layers.dense({inputShape: [1024], units: 64, activation: 'tanh'}));
    
      new_model.add(tf.layers.dense({units: 32, activation: 'relu'}))

      new_model.add(tf.layers.dense({units: 2, activation: 'tanh'}));

      new_model.summary()
      return new_model
      /*
      console.log("loading mobilenet model")
      let net = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
      console.log("model loaded successfully")

      const trainableLayers=['denseModified','conv_pw_13_bn','conv_pw_13','conv_dw_13_bn','conv _dw_13'];

      const x=net.getLayer('global_average_pooling2d_1');
      const predictions= tf.layers.dense({units: 2,  activation: 'softmax',name: 'denseModified'}).apply(x.output); 
      let mobilenetModified = tf.model({inputs: net.input, outputs:  predictions, name: 'modelModified' });
      console.log('Mobilenet model is modified')
      mobilenetModified =
      this.freezeModelLayers(trainableLayers,mobilenetModified)
      console.log('ModifiedMobilenet model layers are freezed')
      mobilenetModified.compile({loss: categoricalCrossentropy,  optimizer: tf.train.adam(1e-3), metrics:   ['accuracy','crossentropy']});
      //net.dispose();
      //x.dispose();
      return mobilenetModified*/

    },
    //-------------------------------------------------------------
    // freezes mobilenet layers to make them untrainable
    // just keeps final layers trainable with argument trainableLayers
    //-------------------------------------------------------------
    freezeModelLayers(trainableLayers,mobilenetModified)
    {
    for (const layer of mobilenetModified.layers)
    {
      layer.trainable = false;
      for (const tobeTrained of trainableLayers)
      {
        if (layer.name.indexOf(tobeTrained) === 0)
        {
          layer.trainable = true;
          break;
        }
      }
      }
    return mobilenetModified;
    },
    /*
      // ATTENTION: it is not possible yet to use Resnet in the browser, I will be using mobilenet
      //tf.keras.applications.ResNet50(true,'imagenet',512)
      const IMAGE_H = 28;
      const IMAGE_W = 28;
      // Create a sequential neural network model. tf.sequential provides an API
      // for creating "stacked" models where the output from one layer is used as
      // the input to the next layer.
      const model = tf.sequential();
    
      // The first layer of the convolutional neural network plays a dual role:
      // it is both the input layer of the neural network and a layer that performs
      // the first convolution operation on the input. It receives the 28x28 pixels
      // black and white images. This input layer uses 16 filters with a kernel size
      // of 5 pixels each. It uses a simple RELU activation function which pretty
      // much just looks like this: __/
      model.add(tf.layers.conv2d({
        inputShape: [IMAGE_H*11, IMAGE_W, 3],
        kernelSize: 3,
        filters: 16,
        activation: 'relu'
      }));
    
      // After the first layer we include a MaxPooling layer. This acts as a sort of
      // downsampling using max values in a region instead of averaging.
      // https://www.quora.com/What-is-max-pooling-in-convolutional-neural-networks
      model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
    
      // Now we flatten the output from the 2D filters into a 1D vector to prepare
      // it for input into our last layer. This is common practice when feeding
      // higher dimensional data to a final classification output layer.
      model.add(tf.layers.flatten({}));
    
      model.add(tf.layers.dense({units: 512, activation: 'relu'}));

      model.add(tf.layers.dense({units: 2*512, activation: 'relu'}));
    
      model.add(tf.layers.dense({units: 2, activation: 'tanh'}));
    
      return model;
    
    },*/
    /**
     * Creates a convolutional neural network (Convnet) for the MNIST data.
     *
     * @returns {tf.Model} An instance of tf.Model.
     */
    createConvModel(){
      const IMAGE_H = 28;
      const IMAGE_W = 28;
      // Create a sequential neural network model. tf.sequential provides an API
      // for creating "stacked" models where the output from one layer is used as
      // the input to the next layer.
      const model = tf.sequential();
    
      // The first layer of the convolutional neural network plays a dual role:
      // it is both the input layer of the neural network and a layer that performs
      // the first convolution operation on the input. It receives the 28x28 pixels
      // black and white images. This input layer uses 16 filters with a kernel size
      // of 5 pixels each. It uses a simple RELU activation function which pretty
      // much just looks like this: __/
      model.add(tf.layers.conv2d({
        inputShape: [IMAGE_H*11, IMAGE_W, 3], //todo: CHANGE TO 11
        kernelSize: 3,
        filters: 16,
        activation: 'relu'
      }));
    
      // After the first layer we include a MaxPooling layer. This acts as a sort of
      // downsampling using max values in a region instead of averaging.
      // https://www.quora.com/What-is-max-pooling-in-convolutional-neural-networks
      model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
    
      // Our third layer is another convolution, this time with 32 filters.
      model.add(tf.layers.conv2d({kernelSize: 3, filters: 32, activation: 'relu'}));
    
      // Max pooling again.
      model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
    
      // Add another conv2d layer.
      model.add(tf.layers.conv2d({kernelSize: 3, filters: 32, activation: 'relu'}));
    
      // Now we flatten the output from the 2D filters into a 1D vector to prepare
      // it for input into our last layer. This is common practice when feeding
      // higher dimensional data to a final classification output layer.
      model.add(tf.layers.flatten({}));
    
      model.add(tf.layers.dense({units: 64, activation: 'relu'}));
    
      // Our last layer is a dense layer which has 10 output units, one for each
      // output class (i.e. 0, 1, 2, 3, 4, 5, 6, 7, 8, 9). Here the classes actually
      // represent numbers, but it's the same idea if you had classes that
      // represented other entities like dogs and cats (two output classes: 0, 1).
      // We use the softmax function as the activation for the output layer as it
      // creates a probability distribution over our 10 classes so their output
      // values sum to 1.
      model.add(tf.layers.dense({units: 2, activation: 'softmax'}));
    
      return model;
  },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function () {
      // Code that will run only after the
      // entire view has been rendered
      
      /**
        * #######################################
        * CODE TO HANDLE CREATION OF THE MODEL
        * #######################################
        */

       model = await this.create_model();
       this.model = model
       const save_path = "localstorage://".concat(this.model_name);
       const saveResults = await model.save(save_path);

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