<template>
  <div
    class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen p-4 overflow-x-hidden overflow-y-auto"
  >
    <div class="p-4">
      <div class="min-w-full">
        <h1 class="text-xl pt-4 pl-4 font-medium leading-none">
          <span class="text-primary-dark dark:text-primary-light"
            >One last step.</span
          >
          Before training, please from the options bellow, choose a model you
          would like to use. If its you first time using the application, please
          create new model.
        </h1>
      </div>
    </div>

    <!-- Card t create a new model-->
    <a id="new-model">
      <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
        <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
          <div
            class="flex items-center justify-between p-4 border-b dark:border-primary"
          >
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Join training with a
              <span class="text-primary-dark dark:text-primary-light">
                new model</span
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
                    d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"
                  />
                </svg>
              </span>
            </div>
          </div>
          <!-- Descrition -->
          <div class="flex items-center justify-between p-4">
            <span class="text-sm text-gray-500 dark:text-light">
              Start with fresh new model that has never been trained.
            </span>
            <button
              class="relative focus:outline-none"
              v-on:click="optionNewModel()"
            >
              <div
                class="w-12 h-6 transition rounded-full outline-none bg-primary-100 dark:bg-primary-darker"
              ></div>
              <div
                class="absolute top-0 left-0 inline-flex items-center justify-center w-6 h-6 transition-all duration-200 ease-in-out transform scale-110 rounded-full shadow-sm"
                :class="{
                  'translate-x-0  bg-white dark:bg-primary-100': !choice_new_model,
                  'translate-x-6 bg-primary-light dark:bg-primary': choice_new_model,
                }"
              ></div>
            </button>
          </div>
        </div>
      </div>
    </a>

    <!-- Card to load a model-->
    <a id="load-model">
      <div
        v-if="saved_model_exists"
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
                  {{ date_saved }}
                </span>
                at
                <span class="text-primary-dark dark:text-primary-light">
                  {{ hour_saved }}
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
                  'translate-x-0  bg-white dark:bg-primary-100': !choice_pre_model,
                  'translate-x-6 bg-primary-light dark:bg-primary': choice_pre_model,
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
        class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
      >
        Go To Training
      </button>
    </div>
  </div>
</template>

<script>
//import ModelMemoryFrame from "../Frames/ModelMemoryFrame"
import * as tf from "@tensorflow/tfjs";
import { get_model_info } from "../../helpers/Memory Script/indexedDB_script";

// Variables used in the script
var saved_model = null;

export default {
  name: "MainModelManagerFrame",
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      saved_model_exists: false,
      ready_to_train: false,
      choice_new_model: false,
      choice_pre_model: false,
      date_saved: "",
      hour_saved: "",
      isDark: this.getTheme(),
    };
  },
  methods: {
    goToTraining() {
      if (!this.ready_to_train) {
        this.$toast.error("Error. Please choose a model before training");
        setTimeout(this.$toast.clear, 30000);
      } else {
        this.$router.push({
          name: 'training', 
          params: {Id: this.Id, Task: this.Task}
        });
      }
    },
    async deleteModel() {
      console.log("Delete Model");
      this.saved_model_exists = false;
      await tf.io.removeModel(
        "indexeddb://saved_".concat(this.Task.training_information.model_id)
      );
    },
    async optionNewModel() {
      this.choice_new_model = !this.choice_new_model;
      if (this.choice_new_model) {
        await this.create_new_model();
        this.ready_to_train = true;

        this.$toast.success(
          "A new "
            .concat(this.Task.training_information.model_id)
            .concat(` has been createded. You can start training!`)
        );
        setTimeout(this.$toast.clear, 30000);
      }
    },

    async optionPrevModel() {
      this.choice_pre_model = !this.choice_pre_model;
      if (this.choice_pre_model) {
        await this.load_saved_model();
        this.ready_to_train = true;

        this.$toast.success(
          "The "
            .concat(this.Task.training_information.model_id)
            .concat(` has been loaded. You can start training!`)
        );
        setTimeout(this.$toast.clear, 30000);
      }
    },

    async load_saved_model() {
      const save_path_db = "indexeddb://working_".concat(
        this.Task.training_information.model_id
      );
      await saved_model.save(save_path_db);
    },

    async create_new_model() {
      this.Task.create_model();
    },
    getTheme: function () {
      if (window.localStorage.getItem("dark")) {
        return JSON.parse(window.localStorage.getItem("dark"));
      }
      return (
        !!window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function () {
      let save_name = "saved_".concat(this.Task.training_information.model_id);
      let model_info = await get_model_info(save_name);

      if (model_info != undefined) {
        const saved_model_path = "indexeddb://".concat(save_name);
        saved_model = await tf.loadLayersModel(saved_model_path);
        if (saved_model != null) {
          let date = model_info.modelArtifactsInfo.dateSaved;
          this.date_saved =
            date.getDate() + "/" + date.getMonth() + "/" + date.getFullYear();
          this.hour_saved = date.getHours() + "h" + date.getMinutes();
          this.saved_model_exists = true;
        }
      }
    });
  },
};
</script>