<template>
  <a id="overview-target">
    <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
      <!-- Overview card -->
      <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
        <!-- Card header -->
        <div
          class="flex items-center justify-between p-4 border-b dark:border-primary"
        >
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            The task
          </h4>
          <div class="flex items-center">
            <span aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                class="bi bi-ui-checks w-7 h-7"
                viewBox="0 0 16 16"
              >
                <path
                  d="M7 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-1zM2 1a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2zm0 8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H2zm.854-3.646a.5.5 0 0 1-.708 0l-1-1a.5.5 0 1 1 .708-.708l.646.647 1.646-1.647a.5.5 0 1 1 .708.708l-2 2zm0 8a.5.5 0 0 1-.708 0l-1-1a.5.5 0 0 1 .708-.708l.646.647 1.646-1.647a.5.5 0 0 1 .708.708l-2 2zM7 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-1zm0-5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"
                />
              </svg>
            </span>
          </div>
        </div>
        <!-- Descrition -->
        <div class="relative p-4">
          <span class="text-sm text-gray-500 dark:text-light"
            ><span v-html="OverviewText"></span
          ></span>
        </div>
      </div>
    </div>
  </a>

  <a id="limitations-target">
    <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
      <!-- Limitations card -->
      <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
        <!-- Card header -->
        <div
          class="flex items-center justify-between p-4 border-b dark:border-primary"
        >
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            The model
          </h4>
          <div class="flex items-center">
            <span aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="bi h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </span>
          </div>
        </div>
        <!-- Descrition -->
        <div class="relative p-4">
          <span class="text-sm text-gray-500 dark:text-light"
            ><span v-html="ModelText"></span
          ></span>
        </div>
      </div>
    </div>
  </a>

  <!-- Card to load a model-->
  <a id="load-model">
    <div
      v-if="savedModelExists"
      class="grid grid-cols-1 p-4 space-y-8 lg:gap-8"
    >
      <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
        <div
          class="flex items-center justify-between p-4 border-b dark:border-primary"
        >
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            Join training with a
            <span class="text-primary-dark dark:text-primary-light">
              previous model</span
            >
          </h4>
          <div class="flex items-center">
            <span aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                class="bi bi-ui-checks w-7 h-7"
                viewBox="0 0 16 16"
              >
                <path
                  d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z"
                />
                <path
                  d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z"
                />
                <path
                  d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"
                />
              </svg>
            </span>
          </div>
        </div>
        <!-- Descrition -->
        <div class="flex items-center justify-between p-4">
          <div class>
            <span class="text-sm text-gray-500 dark:text-light"
              >Use a model you've already worked on. <br />
              This model was saved the
              <span class="text-primary-dark dark:text-primary-light">
                {{ dateSaved }}
              </span>
              at
              <span class="text-primary-dark dark:text-primary-light">
                {{ hourSaved }}
              </span>
            </span>
            <div class="pt-4">
              <button
                v-on:click="deleteModel()"
                class="flex items-center justify-center px-4 py-2 space-x-4 transition-colors border rounded-md hover:text-gray-900 hover:border-gray-900 dark:border-primary dark:hover:text-primary-100 dark:hover:border-primary-light focus:outline-none focus:ring focus:ring-primary-lighter focus:ring-offset-2 dark:focus:ring-offset-dark dark:focus:ring-primary-dark"
                :class="{
                  'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100': !isDark,
                  'text-gray-500 dark:text-primary-light': isDark,
                }"
              >
                <span>Delete Model</span>
              </button>
            </div>
          </div>
          <button
            class="relative focus:outline-none"
            v-on:click="optionPrevModel()"
          >
            <div
              class="w-12 h-6 transition rounded-full outline-none bg-primary-100 dark:bg-primary-darker"
            ></div>
            <div
              class="absolute top-0 left-0 inline-flex items-center justify-center w-6 h-6 transition-all duration-200 ease-in-out transform scale-110 rounded-full shadow-sm"
              :class="{
                'translate-x-0  bg-white dark:bg-primary-100': !choicePreModel,
                'translate-x-6 bg-primary-light dark:bg-primary': choicePreModel,
              }"
            ></div>
          </button>
        </div>
      </div>
    </div>
  </a>

  <div class="flex items-center justify-center p-4">
    <button
      id="train-model-button"
      v-on:click="goToTraining()"
      type="button"
      class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
    >
      Join Training
    </button>
  </div>
</template>

<script>
import * as tf from '@tensorflow/tfjs';
import { getModelInfo } from '../../helpers/my_memory_script/indexedDB_script';

// Variables used in the script
export default {
  name: 'DescriptionFrame',
  props: {
    OverviewText: String,
    ModelText: String,
    TradeOffsText: String,
    Id: String,
    Task: Object,
  },
  data() {
    return {
      isModelCreated: false,
      savedModelExists: false,
      readyToTrain: false,
      choicePreModel: false,
      dateSaved: '',
      hourSaved: '',
      isDark: this.getTheme(),
    };
  },
  methods: {
    async goToTraining() {
      if (!this.choicePreModel && !this.isModelCreated) {
        await this.createNewModel();
        this.isModelCreated = true;

        this.readyToTrain = true;

        this.$toast.success(
          'A new '
            .concat(this.Task.trainingInformation.modelId)
            .concat(` has been created. You can start training!`)
        );
        setTimeout(this.$toast.clear, 30000);
      }
      this.$router.push({
        name: this.Id + '.training',
        params: { Id: this.Id },
      });
    },
    async deleteModel() {
      console.log('Delete Model');
      this.savedModelExists = false;
      await tf.io.removeModel(
        'indexeddb://saved_'.concat(this.Task.trainingInformation.modelId)
      );
    },

    async optionPrevModel() {
      this.choicePreModel = !this.choicePreModel;
      if (this.choicePreModel) {
        await this.loadSavedModel();
        this.readyToTrain = true;

        this.$toast.success(
          'The '
            .concat(this.Task.trainingInformation.modelId)
            .concat(` has been loaded. You can start training!`)
        );
        setTimeout(this.$toast.clear, 30000);
      }
    },

    async loadSavedModel() {
      const savedModelPath = 'indexeddb://'.concat(
        'saved_'.concat(this.Task.trainingInformation.modelId)
      );
      var savedModel = await tf.loadLayersModel(savedModelPath);

      const savePathDb = 'indexeddb://working_'.concat(
        this.Task.trainingInformation.modelId
      );
      await savedModel.save(savePathDb);
    },

    async createNewModel() {
      await this.Task.createModel();
    },
    getTheme: function() {
      if (window.localStorage.getItem('dark')) {
        return JSON.parse(window.localStorage.getItem('dark'));
      }
      return (
        !!window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function() {
      let saveName = 'saved_'.concat(this.Task.trainingInformation.modelId);
      let modelInfo = await getModelInfo(saveName);

      if (modelInfo != undefined) {
        let date = modelInfo.modelArtifactsInfo.dateSaved;
        this.dateSaved =
          date.getDate() +
          '/' +
          (date.getMonth() + 1) +
          '/' +
          date.getFullYear();
        this.hourSaved = date.getHours() + 'h' + date.getMinutes();
        this.savedModelExists = true;
      }
    });
  },
};
</script>
