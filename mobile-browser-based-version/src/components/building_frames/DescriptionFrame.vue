<template>
  <a id="overview-target">
    <icon-card header="The task" :description="OverviewText">
      <template v-slot:icon><tasks /></template>
    </icon-card>
  </a>

  <a id="limitations-target">
    <icon-card header="The model" :description="ModelText">
      <template v-slot:icon><model /></template>
    </icon-card>
  </a>

  <!-- Card to load a model-->
  <a id="load-model" v-if="savedModelExists">
    <icon-card header="Join training with a previous model">
      <template v-slot:icon><clock /></template>
      <template v-slot:extra>
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
      </template>
    </icon-card>
  </a>
  <div class="flex items-center justify-center p-4">
    <customButton
      id="train-model-button"
      v-on:click="goToTraining()"
      :center="true"
    >
      Join Training
    </customButton>
  </div>
</template>

<script>
import * as tf from "@tensorflow/tfjs";
import { getModelInfo } from "../../helpers/my_memory_script/indexedDB_script";
import customButton from "../simple/CustomButton";
import Tasks from "../../assets/svg/Tasks.vue";
import Model from "../../assets/svg/Model.vue";
import IconCard from "../containers/IconCard";
import Clock from "../../assets/svg/Clock.vue";
// Variables used in the script
export default {
  name: "DescriptionFrame",
  props: {
    OverviewText: String,
    ModelText: String,
    TradeOffsText: String,
    Id: String,
    Task: Object,
  },
  components: {
    customButton,
    Tasks,
    Model,
    IconCard,
    Clock,
  },
  data() {
    return {
      isModelCreated: false,
      savedModelExists: false,
      readyToTrain: false,
      choicePreModel: false,
      dateSaved: "",
      hourSaved: "",
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
          "A new "
            .concat(this.Task.trainingInformation.modelId)
            .concat(` has been created. You can start training!`)
        );
        setTimeout(this.$toast.clear, 30000);
      }
      this.$router.push({
        name: this.Id + ".training",
        params: { Id: this.Id },
      });
    },
    async deleteModel() {
      console.log("Delete Model");
      this.savedModelExists = false;
      await tf.io.removeModel(
        "indexeddb://saved_".concat(this.Task.trainingInformation.modelId)
      );
    },

    async optionPrevModel() {
      this.choicePreModel = !this.choicePreModel;
      if (this.choicePreModel) {
        await this.loadSavedModel();
        this.readyToTrain = true;

        this.$toast.success(
          "The "
            .concat(this.Task.trainingInformation.modelId)
            .concat(` has been loaded. You can start training!`)
        );
        setTimeout(this.$toast.clear, 30000);
      }
    },

    async loadSavedModel() {
      const savedModelPath = "indexeddb://".concat(
        "saved_".concat(this.Task.trainingInformation.modelId)
      );
      var savedModel = await tf.loadLayersModel(savedModelPath);

      const savePathDb = "indexeddb://working_".concat(
        this.Task.trainingInformation.modelId
      );
      await savedModel.save(savePathDb);
    },

    async createNewModel() {
      await this.Task.createModel();
    },
    getTheme: function() {
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
    this.$nextTick(async function() {
      let saveName = "saved_".concat(this.Task.trainingInformation.modelId);
      let modelInfo = await getModelInfo(saveName);

      if (modelInfo != undefined) {
        let date = modelInfo.modelArtifactsInfo.dateSaved;
        this.dateSaved =
          date.getDate() +
          "/" +
          (date.getMonth() + 1) +
          "/" +
          date.getFullYear();
        this.hourSaved = date.getHours() + "h" + date.getMinutes();
        this.savedModelExists = true;
      }
    });
  },
};
</script>
