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
            <span
              style="white-space: pre-line"
              class="text-sm text-gray-500 dark:text-light"
              >{{ dataFormatInfoText }}</span
            >
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
            <span
              style="white-space: pre-line"
              class="text-sm text-gray-500 dark:text-light"
              >{{ dataExampleText }}</span
            >
          </div>

          <!-- Data Point Example -->
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
        </div>
      </div>
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
    <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
      <!-- Card header -->
      <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
        <div
          class="flex items-center justify-between p-4 border-b dark:border-primary"
        >
          <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
            Map My Data
          </h4>
          <div class="flex items-center">
            <span aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                class="bi bi-bezier2 w-7 h-7"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M1 2.5A1.5 1.5 0 0 1 2.5 1h1A1.5 1.5 0 0 1 5 2.5h4.134a1 1 0 1 1 0 1h-2.01c.18.18.34.381.484.605.638.992.892 2.354.892 3.895 0 1.993.257 3.092.713 3.7.356.476.895.721 1.787.784A1.5 1.5 0 0 1 12.5 11h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5H6.866a1 1 0 1 1 0-1h1.711a2.839 2.839 0 0 1-.165-.2C7.743 11.407 7.5 10.007 7.5 8c0-1.46-.246-2.597-.733-3.355-.39-.605-.952-1-1.767-1.112A1.5 1.5 0 0 1 3.5 5h-1A1.5 1.5 0 0 1 1 3.5v-1zM2.5 2a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm10 10a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1z"
                />
              </svg>
            </span>
          </div>
        </div>
        <div class="relative p-4 overflow-x-scroll">
          <span
            style="white-space: pre-line"
            class="text-sm text-gray-500 dark:text-light"
            >If the header of the file that you've uploaded differs from the one
            shown in example, you can map the expected header to your header
            format bellow.</span
          >
        </div>

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
  </div>
</template>

<script>
import { FileUploadManager } from '../../helpers/data_validation_script/file_upload_manager';
import UploadingFrame from './UploadingFrame';

export default {
  name: 'CsvTestingFrame',
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      // variables for general informations
      modelName: null,
      dataFormatInfoText: '',
      dataExampleText: '',
      dataExample: null,
      // headers related to training task of containing item of the form {id: "", userHeader: ""}
      headers: [],
      predictions: null,
      // takes care of uploading file process
      fileUploadManager: new FileUploadManager(1, this),
    };
  },

  methods: {
    saveModel() {
      this.trainingManager.saveModel();
    },
    async downloadPredictionsCsv() {
      let pred = this.predictions.join('\n');
      const csvContent = this.classColumn + '\n' + pred;
      var downloadLink = document.createElement('a');
      var blob = new Blob(['\ufeff', csvContent]);
      var url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = 'predictions.csv';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    },
    async test_model() {
      const nbrFiles = this.fileUploadManager.numberOfFiles();

      // Check that the user indeed gave a file
      if (nbrFiles == 0) {
        alert('Training aborted. No uploaded file given as input.');
      } else {
        // Assume we only read the first file
        let file = this.fileUploadManager.getFirstFile();
        console.log(this.fileUploadManager);

        let reader = new FileReader();
        reader.onload = async e => {
          // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
          const predictions = await this.Task.predict(
            e,
            this.headers
          );
          this.predictions = predictions
          await this.downloadPredictionsCsv()
        };
        reader.readAsText(file);
      }
      this.downloadPredictionsCsv();
    },
  },
  components: {
    UploadingFrame,
  },

  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function() {
      // initialize information variables
      this.modelName = this.Task.trainingInformation.modelId;

      console.log('Mounting' + this.modelName);
      this.classColumn = this.Task.trainingInformation.outputColumn

      this.dataFormatInfoText = this.Task.displayInformation.dataFormatInformation;
      this.dataExampleText = this.Task.displayInformation.dataExampleText;
      this.Task.displayInformation.headers.forEach(item => {
        if (item !== this.classColumn) {
          this.headers.push({ id: item, userHeader: item });
        }
      });
      this.dataExample = this.Task.displayInformation.dataExample.filter(item => item.columnName !== this.classColumn);
    });
  },
};
</script>
