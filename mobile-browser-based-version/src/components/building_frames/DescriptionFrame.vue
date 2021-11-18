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
  <a id="load-model" v-if="workingModelExistsOnMount">
    <icon-card header="Join training with a previous model">
      <template v-slot:icon><clock /></template>
      <template v-slot:extra>
        <!-- Restore Model -->
        <div class="p-4">
          <div v-if="useIndexedDB && workingModelExists">
            <div class="grid grid-cols-4 items-center justify-items-center">
              <div class="col-span-3">
                <div class="text-sm text-gray-500 dark:text-light">
                  FeAI cached the last model you were working on for you. Select
                  it to start training from it. Otherwise, it will be overridden
                  the next time you train the
                  {{ Task.displayInformation.taskTitle }} task. This model was
                  last updated the
                  <span class="text-primary-dark dark:text-primary-light">
                    {{ dateSaved }}
                  </span>
                  at
                  <span class="text-primary-dark dark:text-primary-light">
                    {{ hourSaved }}
                  </span>
                </div>
              </div>
              <button
                class="relative focus:outline-none"
                v-on:click="toggleUseWorkingModel()"
              >
                <div
                  class="
                    w-12
                    h-6
                    transition
                    rounded-full
                    outline-none
                    bg-primary-100
                    dark:bg-primary-darker
                  "
                ></div>
                <div
                  class="
                    absolute
                    top-0
                    left-0
                    w-6
                    h-6
                    transition-all
                    duration-200
                    ease-in-out
                    transform
                    scale-110
                    rounded-full
                    shadow-sm
                  "
                  :class="{
                    'translate-x-0 bg-white dark:bg-primary-100':
                      !useWorkingModel,
                    'translate-x-6 bg-primary-light dark:bg-primary':
                      useWorkingModel,
                  }"
                ></div>
              </button>
            </div>
            <div class="flex pt-4 space-x-4 justify-center">
              <button
                v-on:click="saveModel()"
                class="
                  flex
                  items-center
                  justify-center
                  px-4
                  py-2
                  space-x-4
                  transition-colors
                  border
                  rounded-md
                  hover:text-gray-900 hover:border-gray-900
                  dark:border-primary
                  dark:hover:text-primary-100
                  dark:hover:border-primary-light
                  focus:outline-none
                  focus:ring
                  focus:ring-primary-lighter
                  focus:ring-offset-2
                  dark:focus:ring-offset-dark dark:focus:ring-primary-dark
                "
                :class="{
                  'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100':
                    !isDark,
                  'text-gray-500 dark:text-primary-light': isDark,
                }"
              >
                <span>Save Model</span>
              </button>
              <button
                v-on:click="deleteModel()"
                class="
                  flex
                  items-center
                  justify-center
                  px-4
                  py-2
                  space-x-4
                  transition-colors
                  border
                  rounded-md
                  hover:text-gray-900 hover:border-gray-900
                  dark:border-primary
                  dark:hover:text-primary-100
                  dark:hover:border-primary-light
                  focus:outline-none
                  focus:ring
                  focus:ring-primary-lighter
                  focus:ring-offset-2
                  dark:focus:ring-offset-dark dark:focus:ring-primary-dark
                "
                :class="{
                  'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100':
                    !isDark,
                  'text-gray-500 dark:text-primary-light': isDark,
                }"
              >
                <span>Delete Model</span>
              </button>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500 dark:text-light">
            <p v-if="!useIndexedDB && workingModelExists">
              FeAI cached the last model you were working on for you. Turn on
              the model library (see settings) to see additional options.
            </p>
            <p v-else>The previous working model has been deleted.</p>
          </div>
        </div>
      </template>
    </icon-card>
  </a>

  <div class="flex items-center justify-center p-4">
    <custom-button
      id="train-model-button"
      v-on:click="goToTraining()"
      :center="true"
    >
      Join Training
    </custom-button>
  </div>
</template>

<script>
import * as memory from '../../helpers/memory/helpers.js';
import CustomButton from '../simple/CustomButton';
import Tasks from '../../assets/svg/Tasks.vue';
import Model from '../../assets/svg/Model.vue';
import Clock from '../../assets/svg/Clock.vue';
import IconCard from '../containers/IconCard.vue';
import { mapState } from 'vuex';

export default {
  name: 'description-frame',
  props: {
    OverviewText: String,
    ModelText: String,
    TradeOffsText: String,
    Id: String,
    Task: Object,
  },
  components: {
    CustomButton,
    Tasks,
    Model,
    IconCard,
    Clock,
  },
  data() {
    return {
      isModelCreated: false,
      workingModelExists: false,
      workingModelExistsOnMount: false,
      useWorkingModel: false,
      dateSaved: '',
      hourSaved: '',
      isDark: this.getTheme(),
    };
  },
  watch: {
    useWorkingModel() {
      let modelInUseMessage;
      if (this.useWorkingModel) {
        modelInUseMessage = `The previous ${this.Task.displayInformation.taskTitle} model has been selected. You can start training!`;
      } else {
        modelInUseMessage = `A new ${this.Task.displayInformation.taskTitle} model will be created. You can start training!`;
      }
      this.$toast.success(modelInUseMessage);
      setTimeout(this.$toast.clear, 30000);
    },
  },
  computed: {
    ...mapState(['useIndexedDB']),
    createFreshModel() {
      return (
        !this.isModelCreated &&
        !(this.workingModelExists && this.useWorkingModel)
      );
    },
  },
  methods: {
    async goToTraining() {
      if (this.useIndexedDB && this.createFreshModel) {
        await this.loadFreshModel();
        this.isModelCreated = true;
        this.$toast.success(
          `A new ${this.Task.displayInformation.taskTitle} model has been created. You can start training!`
        );
        setTimeout(this.$toast.clear, 30000);
      }
      this.$router.push({
        name: this.Id + '.training',
        params: { Id: this.Id },
      });
    },
    async deleteModel() {
      this.workingModelExists = false;
      await memory.deleteWorkingModel(
        this.Task.taskID,
        this.Task.trainingInformation.modelID
      );
      this.$toast.success(
        `Deleted the cached ${this.Task.displayInformation.taskTitle} model.`
      );
      setTimeout(this.$toast.clear, 30000);
    },
    async saveModel() {
      await memory.saveWorkingModel(
        this.Task.taskID,
        this.Task.trainingInformation.modelID
      );
      this.$toast.success(
        `Saved the cached ${this.Task.displayInformation.taskTitle} model to the model library`
      );
      setTimeout(this.$toast.clear, 30000);
    },
    async toggleUseWorkingModel() {
      this.useWorkingModel = !this.useWorkingModel;
    },
    async loadFreshModel() {
      await this.Task.createModel().then((freshModel) => {
        memory.updateWorkingModel(
          this.Task.taskID,
          this.Task.trainingInformation.modelID,
          freshModel
        );
      });
    },
    getTheme() {
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
    this.$nextTick(async function () {
      /**
       * If the IndexedDB is turned on and a working model exists in IndexedDB
       * on loading the description frame, then display the model restoration
       * feature.
       */
      if (this.useIndexedDB) {
        let workingModelMetadata = await memory.getWorkingModelMetadata(
          this.Task.taskID,
          this.Task.trainingInformation.modelID
        );
        if (workingModelMetadata) {
          this.workingModelExistsOnMount = true;
          this.workingModelExists = true;
          let date = workingModelMetadata.dateSaved;
          let zeroPad = (number) => String(number).padStart(2, '0');
          this.dateSaved = [
            date.getDate(),
            date.getMonth() + 1,
            date.getFullYear(),
          ]
            .map(zeroPad)
            .join('/');
          this.hourSaved = [date.getHours(), date.getMinutes()]
            .map(zeroPad)
            .join('h');
        }
      }
    });
  },
};
</script>
