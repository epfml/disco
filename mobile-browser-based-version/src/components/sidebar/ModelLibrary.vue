<template>
  <!-- Panel content -->
  <div class="flex flex-col h-screen">
    <!-- Panel header -->
    <div
      class="
        flex flex-col
        items-center
        justify-center
        flex-shrink-0
        px-4
        py-8
        space-y-4
        border-b
        dark:border-primary-dark
      "
    >
      <span class="text-gray-500 dark:text-primary"><stack-icon/></span>
      <h2
        id="settinsPanelLabel"
        class="text-xl font-medium text-gray-500 dark:text-light"
      >
        Model Library
      </h2>
    </div>
    <!-- Content -->
    <div class="flex-1 overflow-hidden hover:overflow-y-auto">
      <!-- Model list -->
      <div class="p-4 space-y-4 md:p-8">
        <h6 class="text-lg font-medium text-gray-400 dark:text-light">
          My model library
        </h6>
        <span class="text-s">
          <p v-if="useIndexedDB">List of trained models that were saved.</p>
          <p v-else>
            The model library is currently unavailable. You can turn it on in
            the
            <button class="text-blue-600" v-on:click="switchToSettings()">
              settings menu</button
            >.
          </p>
        </span>
        <div v-if="useIndexedDB">
          <div v-for="(item, idx) in modelMap" :key="idx">
            <div
              class="flex items-center grid-cols-3 justify-between px-4 py-2 space-x-4 transition-colors border rounded-md hover:text-gray-900 hover:border-gray-900 dark:border-primary dark:hover:text-primary-100 dark:hover:border-primary-light focus:outline-none focus:ring focus:ring-primary-lighter focus:ring-offset-2 dark:focus:ring-offset-dark dark:focus:ring-primary-dark"
            >
              <div
                class="cursor-pointer w-2/3"
                v-on:click="openTesting(item[1])"
              >
                <span>
                  {{ item[1].modelName.substring(0, 16) }} <br />
                  <span class="text-xs">
                    {{ item[1].date }} at {{ item[1].hours }} <br />
                    {{ item[1].fileSize }} KB
                  </span>
                </span>
              </div>
              <div class="w-1/9">
                <button
                  v-on:click="deleteModel(item[0])"
                  :class="buttonClass(isDark)"
                >
                  <span><bin2-icon /></span>
                </button>
              </div>
              <div class="w-1/9">
                <button
                  v-on:click="downloadModel(item[1])"
                  :class="buttonClass(isDark)"
                >
                  <span><download-2-icon /></span>
                </button>
              </div>
              <div class="w-1/9">
                <button
                  v-on:click="loadModel(item[1])"
                  :class="buttonClass(isDark)"
                >
                  <span><load-icon /></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import * as memory from "../../helpers/memory/helpers";
import * as tf from "@tensorflow/tfjs";
import { mapState } from "vuex";
import Bin2Icon from "../../assets/svg/Bin2Icon.vue";
import Download2Icon from "../../assets/svg/Download2Icon.vue";
import LoadIcon from "../../assets/svg/LoadIcon.vue";
import StackIcon from '../../assets/svg/StackIcon.vue';

export default {
  name: "model-library",
  emits: ["switch-panel"],
  components: {
    Bin2Icon,
    Download2Icon,
    LoadIcon,
    StackIcon,
  },
  data() {
    return {
      modelMap: new Map(),
    };
  },
  computed: {
    ...mapState(["useIndexedDB"]),
  },
  methods: {
    buttonClass: function(state) {
      return `flex items-center grid-cols-3 justify-between px-4 py-2 space-x-4 transition-colors border rounded-md hover:text-gray-900 hover:border-gray-900 dark:border-primary dark:hover:text-primary-100 dark:hover:border-primary-light focus:outline-none focus:ring focus:ring-primary-lighter focus:ring-offset-2 dark:focus:ring-offset-dark dark:focus:ring-primary-dark ${
        state
          ? "border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100"
          : "text-gray-500 dark:text-primary-light"
      }`;
    },
    switchToSettings() {
      this.$emit("switch-panel");
    },
    async refreshModelLibrary() {
      console.log("Refreshing the model library.");
      this.modelMap.clear();
      await tf.io.listModels().then((models) => {
        for (let savePath in models) {
          let [location, _, directory, task, name] = savePath.split("/");
          if (!(location === "indexeddb:" && directory === "saved")) {
            continue;
          }

          let modelMetadata = models[savePath];
          let date = new Date(modelMetadata.dateSaved);
          let zeroPad = (number) => String(number).padStart(2, "0");
          let dateSaved = [
            date.getDate(),
            date.getMonth() + 1,
            date.getFullYear(),
          ]
            .map(zeroPad)
            .join("/");
          let hourSaved = [date.getHours(), date.getMinutes()]
            .map(zeroPad)
            .join("h");
          let size =
            modelMetadata.modelTopologyBytes +
            modelMetadata.weightSpecsBytes +
            modelMetadata.weightDataBytes;

          this.modelMap.set(savePath, {
            modelName: name,
            taskID: task,
            modelType: directory,
            date: dateSaved,
            hours: hourSaved,
            fileSize: size / 1000,
          });
        }
      });
    },

    deleteModel(savePath) {
      let modelMetadata = this.modelMap.get(savePath);
      this.modelMap.delete(savePath);
      memory.deleteSavedModel(modelMetadata.taskID, modelMetadata.modelName);
    },

    openTesting(modelMetadata) {
      this.$router.push({ name: modelMetadata.taskID.concat(".testing") });
    },

    downloadModel(modelMetadata) {
      memory.downloadSavedModel(modelMetadata.taskID, modelMetadata.modelName);
    },

    async loadModel(modelMetadata) {
      await memory.loadSavedModel(
        modelMetadata.taskID,
        modelMetadata.modelName
      );
      this.$toast.success(
        `Loaded ${modelMetadata.modelName}, ready for next training session.`
      );
    },
  },
  mounted() {
    this.refreshModelLibrary();
  },
};
</script>
