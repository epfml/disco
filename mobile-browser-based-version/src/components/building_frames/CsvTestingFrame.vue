<template>
  <div
    class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen p-4 overflow-x-hidden overflow-y-auto"
  >
    <a id="overview-target">
      <icon-card
        header="Data Format Information"
        :description="dataFormatInfoText"
      >
        <template v-slot:icon><check-list /></template>
      </icon-card>
    </a>
    <a id="limitations-target">
      <icon-card header="Data Example" :description="dataExampleText">
        <template v-slot:icon><file-earmark-ruled /></template>
        <!-- Data Point Example -->
        <template v-slot:extra>
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
        </template>
      </icon-card>
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

    <icon-card header="Map My Data" :description="dataExampleText">
      <template v-slot:icon><bezier-2 /></template>
      <template v-slot:extra>
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
      </template>
    </icon-card>

    <!-- Test Button -->
    <div class="flex items-center justify-center p-4">
      <customButton v-on:click="test_mode()" :center="true">
        Test
      </customButton>
    </div>
  </div>
</template>

<script>
import { FileUploadManager } from "../../helpers/data_validation_script/file_upload_manager";
import UploadingFrame from "./UploadingFrame";
import IconCard from "../containers/IconCard";
import CheckList from "../../assets/svg/CheckList";
import FileEarmarkRuled from "../../assets/svg/FileEarmarkRuled";
import Bezier2 from "../../assets/svg/Bezier2";
import CustomButton from "../simple/CustomButton";

export default {
  name: "CsvTestingFrame",
  props: {
    Id: String,
    Task: Object,
  },
  components: {
    UploadingFrame,
    IconCard,
    CheckList,
    FileEarmarkRuled,
    Bezier2,
    CustomButton,
  },
  data() {
    return {
      // variables for general informations
      modelName: null,
      dataFormatInfoText: "",
      dataExampleText: "",
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
      let pred = this.predictions.join("\n");
      const csvContent = this.classColumn + "\n" + pred;
      var downloadLink = document.createElement("a");
      var blob = new Blob(["\ufeff", csvContent]);
      var url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = "predictions.csv";

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    },
    async test_model() {
      const nbrFiles = this.fileUploadManager.numberOfFiles();

      // Check that the user indeed gave a file
      if (nbrFiles == 0) {
        alert("Training aborted. No uploaded file given as input.");
      } else {
        // Assume we only read the first file
        let file = this.fileUploadManager.getFirstFile();
        console.log(this.fileUploadManager);

        let reader = new FileReader();
        reader.onload = async (e) => {
          // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
          const predictions = await this.Task.predict(e, this.headers);
          this.predictions = predictions;
          await this.downloadPredictionsCsv();
        };
        reader.readAsText(file);
      }
      this.downloadPredictionsCsv();
    },
  },

  async mounted() {
    // This method is called when the component is created
    this.$nextTick(async function() {
      // initialize information variables
      this.modelName = this.Task.trainingInformation.modelId;

      console.log("Mounting" + this.modelName);
      this.classColumn = this.Task.trainingInformation.outputColumn;

      this.dataFormatInfoText = this.Task.displayInformation.dataFormatInformation;
      this.dataExampleText = this.Task.displayInformation.dataExampleText;
      this.Task.displayInformation.headers.forEach((item) => {
        if (item !== this.classColumn) {
          this.headers.push({ id: item, userHeader: item });
        }
      });
      this.dataExample = this.Task.displayInformation.dataExample.filter(
        (item) => item.columnName !== this.classColumn
      );
    });
  },
};
</script>
