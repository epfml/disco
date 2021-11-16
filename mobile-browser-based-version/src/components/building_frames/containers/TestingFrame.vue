<template>
  <ActionFrame :Task="Task">
    <template v-slot:dataExample><slot name="dataExample"></slot></template>
    <template v-slot:action>
      <!-- Upload File -->
      <div class="relative">
        <UploadingFrame
          v-bind:Id="Id"
          v-bind:Task="Task"
          v-bind:fileUploadManager="fileUploadManager"
          v-if="fileUploadManager"
          :displayLabels="false"
        />
      </div>

      <!-- Test Button -->
      <div class="flex items-center justify-center p-4">
        <customButton v-on:click="testModel()" :center="true">
          Test
        </customButton>
      </div>
      <!-- Display predictions -->
      <slot name="predictionResults"></slot>
    </template>
  </ActionFrame>
</template>

<script>
import { FileUploadManager } from "../../../helpers/data_validation_script/file_upload_manager";
import UploadingFrame from "../upload/UploadingFrame";
import CustomButton from "../../simple/CustomButton";
import ActionFrame from "./ActionFrame";

export default {
  name: "TestingFrame",
  props: {
    Id: String,
    Task: Object,
    nbrClasses: Number,
    makePredictions: Function,
    predictionsToCsv: Function,
  },
  components: {
    ActionFrame,
    UploadingFrame,
    CustomButton,
  },
  data() {
    return {
      predictions: null,
      // takes care of uploading file process
      fileUploadManager: new FileUploadManager(1, this),
    };
  },

  methods: {
    async downloadPredictions(csvContent, fileName = "predictions.csv") {
      // artificially creates a <a> tag to simulate click event and triger download
      var downloadLink = document.createElement("a");
      var blob = new Blob(["\ufeff", csvContent]);
      var url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      this.$toast.success(`Predictions have been downloaded.`);
      setTimeout(this.$toast.clear, 30000);
    },
    async testModel() {
      const nbrFiles = this.fileUploadManager.numberOfFiles();
      // Check that the user indeed gave a file
      if (nbrFiles == 0) {
        this.$toast.error(`Training aborted. No uploaded file given as input.`);
        setTimeout(this.$toast.clear, 30000);
      } else {
        // Assume we only read the first file
        this.$toast.success(
          `Thank you for your contribution. Testing has started`
        );
        setTimeout(this.$toast.clear, 30000);
        console.log(this.fileUploadManager);
        var filesElement =
          nbrFiles > 1
            ? this.fileUploadManager.getFilesList()
            : this.fileUploadManager.getFirstFile();
        // filtering phase (optional)
        if (this.filterData) {
          // data checking is optional
          filesElement = await this.filterData(
            filesElement,
            this.Task.trainingInformation
          );
        }
        // prediction
        this.predictions = await this.makePredictions(filesElement);
        // reset fileloader 
        this.fileUploadManager.clear();
        if (this.predictions) {
          let csvContent = await this.predictionsToCsv(this.predictions);
          await this.downloadPredictions(csvContent);
        }
      }
    },
  },
};
</script>
