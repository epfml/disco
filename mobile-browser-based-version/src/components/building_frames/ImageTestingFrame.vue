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
          <img
            :src="getImage(DataExampleImage)"
            v-bind:alt="DataExampleImage"
          />
        </div>
      </div>
    </a>

    <!-- Upload File Card-->
    <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
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
        <div class="relative pb-4">
          <article
            aria-label="File Upload Modal"
            class="relative h-full flex flex-col p-4 bg-white rounded-lg dark:bg-darker"
            ondrop="dropHandler(event);"
            ondragover="dragOverHandler(event);"
            ondragleave="dragLeaveHandler(event);"
            ondragenter="dragEnterHandler(event);"
          >
            <!-- scroll area -->
            <section
              class="h-full overflow-auto p-8 w-full h-full flex flex-col"
            >
              <header
                class="border-dashed border-2 border-gray-500 dark:border-primary flex flex-col justify-center items-center"
              >
                <p
                  class="mb-3 p-4 text-lg font-semibold dark:text-lightflex flex-wrap justify-center"
                >
                  <span>Drag and drop your</span>&nbsp;<span
                    >files anywhere or</span
                  >
                </p>
                <input id="hidden-input" type="file" multiple class="hidden" />
                <div class="p-4">
                  <button
                    id="button"
                    class="mt-2 p-2 rounded-sm text-white transition-colors duration-200 bg-primary hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark focus:outline-none focus:bg-primary-100 dark:focus:bg-primary-dark focus:ring-primary-darker"
                  >
                    Upload files
                  </button>
                </div>
              </header>

              <div class="pt-4">
                <h1
                  class="pt-8 pb-3 font-semibold sm:text-lg dark:text-lightflex"
                >
                  Files Selected
                </h1>

                <ul id="gallery" class="flex flex-1 flex-wrap -m-1">
                  <li
                    id="empty"
                    class="h-full w-full text-center flex flex-col items-center justify-center items-center"
                  >
                    <img
                      class="mx-auto w-32"
                      src="https://user-images.githubusercontent.com/507615/54591670-ac0a0180-4a65-11e9-846c-e55ffce0fe7b.png"
                      alt="no data"
                    />
                    <span class="text-small text-gray-500 dark:text-lightflex"
                      >No files selected</span
                    >
                  </li>
                </ul>
              </div>
            </section>
          </article>
        </div>
      </div>
    </div>

    <!-- Test Button -->
    <div class="flex items-center justify-center p-4">
      <button
        v-on:click="test_model()"
        type="button"
        class="text-lg border-2 border-transparent bg-green-500 ml-3 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none hover:scale-110 duration-500 focus:outline-none"
      >
        Test
      </button>
    </div>

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
import ImagePredictionResultsFrame from '../building_frames/ImagePredictionResultsFrame';
export default {
  components: {
    ImagePredictionResultsFrame,
  },
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      title: 'mnist-testing',
      DataFormatInfoText: '',
      DataExampleText: '',
      DataExampleImage: '',

      // Different Task Labels
      taskLabels: [],
      IMAGE_HEIGHT: null,
      IMAGE_WIDTH: null,

      model_name: '',
      FILES: {},
      gotResults: false,
      classes: null,
      imgTested: null,
      expectedFiles: 0,
    };
  },
  methods: {
    async test_model() {
      const filesElement = document.getElementById('hidden-input');
      console.log(filesElement);
      let files = filesElement.files;
      this.expectedFiles = files.length;

      // Only process image files (skip non image files)
      for (let i = 0; i < files.length; ++i) {
        const file = files[i];
        if (file && file.type.match('image.*')) {
          const objectURL = URL.createObjectURL(file);
          this.FILES[objectURL] = { name: file.name };
        }
      }

      this.predict();

      // Empty input
      filesElement.value = '';
    },

    async predict() {
      const classes = await this.Task.predict(this.FILES);

      const ids = Object.keys(classes);
      if (ids.length == 1) {
        this.showResults(classes[ids[0]]);
        this.$toast.success(`Predictions are available below.`);
      } else {
        this.predictions = classes;
        this.downloadPredictionsCsv();
        this.$toast.success(`Predictions have been downloaded.`);
      }

      setTimeout(this.$toast.clear, 30000);
    },

    showResults(classes) {
      this.classes = classes;
      this.gotResults = true;
    },
    downloadPredictionsCsv() {
      console.log(this.predictions);
      let pred = '';
      let header_length = 0;
      for (const [id, prediction] of Object.entries(this.predictions)) {
        header_length = prediction.length;
        pred +=
          id +
          ',' +
          prediction
            .map(dict => dict['className'] + ',' + dict['probability'])
            .join(',') +
          '\n';
      }

      let header = 'id,';
      for (let i = 1; i <= header_length; ++i) {
        header += 'top' + i + ',probability';
        if (i != header_length) {
          header += ',';
        } else {
          header += '\n';
        }
      }
      const csvContent = header + pred;
      var downloadLink = document.createElement('a');
      var blob = new Blob(['\ufeff', csvContent]);
      var url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = 'predictions.csv';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    },
    getImage(url) {
      if (url == '') {
        return null;
      }

      console.log(url);
      var images = require.context('../../../example_training_data/', false);
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
      this.model_name = this.Task.trainingInformation.modelId;
      this.DataFormatInfoText = this.Task.displayInformation.dataFormatInformation;
      this.DataExampleText = this.Task.displayInformation.dataExampleText;
      this.DataExampleImage = this.Task.displayInformation.dataExampleImage;
      this.IMAGE_HEIGHT = this.Task.trainingInformation.IMAGE_HEIGHT;
      this.IMAGE_WIDTH = this.Task.trainingInformation.IMAGE_WIDTH;
      this.taskLabels = this.Task.trainingInformation.taskLabels;

      const imageTempl = document.getElementById('image-template'),
        empty = document.getElementById('empty');
      function addFile(target, file) {
        const objectURL = URL.createObjectURL(file);
        const clone = imageTempl.cloneNode(true);
        clone.querySelector('h1').textContent = file.name;
        clone.querySelector('li').id = objectURL;
        clone.querySelector('.delete').dataset.target = objectURL;
        clone.querySelector('.size').textContent =
          file.size > 1024
            ? file.size > 1048576
              ? Math.round(file.size / 1048576) + 'mb'
              : Math.round(file.size / 1024) + 'kb'
            : file.size + 'b';
        Object.assign(clone.querySelector('img'), {
          src: objectURL,
          alt: file.name,
        });
        empty.classList.add('hidden');
        target.prepend(clone.firstElementChild);
      }
      const gallery = document.getElementById('gallery');
      const hidden = document.getElementById('hidden-input');
      document.getElementById('button').onclick = () => hidden.click();
      hidden.onchange = e => {
        for (const file of e.target.files) {
          addFile(gallery, file);
        }
      };
      /**
       * Returns the CSS colors graphs should be rendered in
       */
      const cssColors = color => {
        return getComputedStyle(document.documentElement).getPropertyValue(
          color
        );
      };
      /**
       * Returns the colors depending on user's choice graphs should be rendered in
       */
      const getColor = () => {
        return window.localStorage.getItem('color') ?? 'cyan';
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
