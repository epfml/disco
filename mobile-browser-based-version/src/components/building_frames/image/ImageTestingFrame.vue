<template>
  <TestingFrame
    :Id="Id"
    :Task="Task"
    :nbrClasses="Task.trainingInformation.LABEL_LIST.length"
    :filterData="filterData"
    :makePredictions="makePredictions"
    :predictionsToCsv="predictionsToCsv"
  >
    <template v-slot:dataExample>
      <!-- Data Point Example -->
      <div class="flex object-center">
        <img
          class="object-center"
          :src="getImage(dataExampleImage)"
          v-bind:alt="dataExampleImage"
        /><img />
      </div>
    </template>
    <template v-slot:extra></template>

    <template v-slot:predictionResults>
      <ImagePredictionResultsFrame
        v-if="gotResults"
        :classes="classes"
        :imageElement="imgTested"
      />

      <div id="predictions"></div>
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
                    <picture-background />
                  </i>
                </span>

                <p class="p-1 size text-xs"></p>
                <button
                  class="delete ml-auto focus:outline-none hover:bg-gray-300 p-1 rounded-md"
                >
                  <bin />
                </button>
              </div>
            </section>
          </article>
        </li>
      </template>
    </template>
  </TestingFrame>
</template>

<script>
import TestingFrame from "../containers/TestingFrame";
import ImagePredictionResultsFrame from "./ImagePredictionResultsFrame";
import PictureBackground from "../../../assets/svg/PictureBackground";
import Bin from "../../../assets/svg/Bin.vue";
export default {
  components: {
    TestingFrame,
    ImagePredictionResultsFrame,
    PictureBackground,
    Bin,
  },
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      dataExampleImage: "",
      // Different Task Labels
      taskLabels: [],
      IMAGE_HEIGHT: null,
      IMAGE_WIDTH: null,
      FILES: {},
      gotResults: false,
      classes: null,
      imgTested: null,
      expectedFiles: 0,
    };
  },
  methods: {
    async filterData(filesElement) {
      let files = filesElement.files;
      this.expectedFiles = files.length;
      // Only process image files (skip non image files)
      for (let i = 0; i < files.length; ++i) {
        const file = files[i];
        if (file && file.type.match("image.*")) {
          const objectURL = URL.createObjectURL(file);
          this.FILES[objectURL] = { name: file.name };
        }
      }
      return this.FILES;
    },

    async makePredictions(filesElement) {
      const classes = await this.Task.predict(filesElement);
      const ids = Object.keys(classes);
      var predictions;
      if (ids.length == 1) {
        // display results in the component
        this.classes = classes[ids[0]];
        this.gotResults = true;
        this.$toast.success(`Predictions are available below.`);
        setTimeout(this.$toast.clear, 30000);   
      } else {
        predictions = classes;     
      }
      return predictions;
    },
    async predictionsToCsv(predictions) {
      let pred = "";
      let header_length = 0;
      for (const [id, prediction] of Object.entries(predictions)) {
        header_length = prediction.length;
        pred += `id,${prediction
          .map((dict) => dict["className"] + "," + dict["probability"])
          .join(",")} \n`;
      }
      let header = "id,";
      for (let i = 1; i <= header_length; ++i) {
        header += `top ${i},probability${i != header_length ? "," : "\n"}`;
      }
      const csvContent = header + pred;
      return csvContent;
    },
    getImage(url) {
      if (url == "") {
        return null;
      }
      console.log(url);
      var images = require.context("../../../../example_training_data/", false);
      return images(url);
    },
  },
  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function() {
      // Code that will run only after the
      // entire view has been rendered
      /**
       * #######################################
       * LOAD INFORMATION ABOUT THE TASK
       * #######################################
       */
      // Initialize variables used by the components
      this.dataExampleImage = this.Task.displayInformation.dataExampleImage;
      this.IMAGE_HEIGHT = this.Task.trainingInformation.IMAGE_HEIGHT;
      this.IMAGE_WIDTH = this.Task.trainingInformation.IMAGE_WIDTH;
      this.taskLabels = this.Task.trainingInformation.taskLabels;

      const imageTempl = document.getElementById("image-template"),
        empty = document.getElementById("empty");
      function addFile(target, file) {
        const objectURL = URL.createObjectURL(file);
        const clone = imageTempl.cloneNode(true);
        clone.querySelector("h1").textContent = file.name;
        clone.querySelector("li").id = objectURL;
        clone.querySelector(".delete").dataset.target = objectURL;
        clone.querySelector(".size").textContent =
          file.size > 1024
            ? file.size > 1048576
              ? Math.round(file.size / 1048576) + "mb"
              : Math.round(file.size / 1024) + "kb"
            : file.size + "b";
        Object.assign(clone.querySelector("img"), {
          src: objectURL,
          alt: file.name,
        });
        empty.classList.add("hidden");
        target.prepend(clone.firstElementChild);
      }
      const gallery = document.getElementById("gallery");
      const hidden = document.getElementById("hidden-input");
      document.getElementById("button").onclick = () => hidden.click();
      hidden.onchange = (e) => {
        for (const file of e.target.files) {
          addFile(gallery, file);
        }
      };
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
    });
  },
};
</script>
