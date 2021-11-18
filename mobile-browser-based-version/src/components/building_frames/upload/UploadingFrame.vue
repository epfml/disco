<template>
  <icon-card :header="header()">
    <template v-slot:icon><upload /></template>
    <template v-slot:extra>
      <div v-for="item in formatLabels()" :key="item">
        <SingleUploadFrame
          :Id="Id"
          :Task="Task"
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
import Upload from '../../../assets/svg/Upload.vue';
import IconCard from '../../containers/IconCard.vue';
import SingleUploadFrame from './SingleUploadFrame';

export default {
  name: 'UploadingFrame',
  props: {
    Id: String,
    Task: Object,
    fileUploadManager: Object,
    displayLabels: { default: true, type: Boolean },
  },
  data() {
    return {
      labels: null,
      nbrLabels: null,
      csvLabels: false,
    };
  },
  methods: {
    preview() {
      return this.csvLabels || this.nbrLabels == 1;
    },
    header() {
      return !this.displayLabels
        ? 'Upload My Data'
        : this.csvLabels
        ? 'Link My Data'
        : 'Connect Data';
    },
    formatLabels() {
      return !this.displayLabels
        ? ['']
        : this.csvLabels
        ? ['Images', 'Labels']
        : this.nbrLabels == 1
        ? [1]
        : this.labels;
    },
  },
  components: {
    SingleUploadFrame,
    Upload,
    IconCard,
  },
  mounted() {
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
