<template>
  <icon-card :header="header()">
    <template v-slot:icon><upload /></template>
    <template v-slot:extra>
      <div v-for="item in formatLabels()" :key="item">
        <single-upload-frame
          :id="id"
          :task="task"
          :fileUploadManager="fileUploadManager"
          :preview="preview()"
          :label="String(item)"
          :displayLabels="displayLabels"
        />
      </div>
    </template>
  </icon-card>
</template>

<script>
import Upload from "../../../assets/svg/Upload.vue";
import IconCard from "../../containers/IconCard.vue";
import SingleUploadFrame from "./SingleUploadFrame.vue";

export default {
  name: "uploading-frame",
  props: {
    id: String,
    task: Object,
    fileUploadManager: Object,
    displayLabels: { default: true, type: Boolean },
  },
  components: {
    SingleUploadFrame,
    Upload,
    IconCard,
  },
  data() {
    return {
      labels: null,
      nbrLabels: null,
      csvLabels: false,
      dataTypeIsCsv: false,
    };
  },
  methods: {
    preview() {
      // Preview only for csv (since there is no, "show only first n images").
      return this.dataTypeIsCsv;
    },
    header() {
      return !this.displayLabels
        ? "Upload My Data"
        : this.csvLabels
        ? "Link My Data"
        : "Connect Data";
    },
    formatLabels() {
      return !this.displayLabels
        ? [""]
        : this.csvLabels
        ? ["Images", "Labels"]
        : this.nbrLabels == 1
        ? [1]
        : this.labels;
    },
  },
  mounted() {
    this.dataTypeIsCsv = this.Task.trainingInformation.dataType == "csv";
    if (this.Task.trainingInformation.LABEL_LIST) {
      this.labels = this.Task.trainingInformation.LABEL_LIST;
      this.nbrLabels = this.Task.trainingInformation.LABEL_LIST.length;
    } else {
      this.nbrLabels = 1;
    }
    if (this.Task.trainingInformation.LABEL_ASSIGNMENT) {
      this.csvLabels = true;
    }
  },
};
</script>
