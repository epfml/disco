<template>
  <icon-card header="Upload my data">
    <template v-slot:icon><upload /></template>
    <template v-slot:extra>
      <div v-for="item in formatLabels" :key="item">
        <single-upload-frame
          :id="id"
          :task="task"
          :fileUploadManager="fileUploadManager"
          :preview="preview"
          :label="String(item)"
        />
      </div>
    </template>
  </icon-card>
</template>

<script>
import Upload from '../../../assets/svg/Upload.vue'
import IconCard from '../../containers/IconCard.vue'
import SingleUploadFrame from './SingleUploadFrame.vue'
export default {
  name: 'uploading-frame',
  props: {
    id: String,
    task: Object,
    fileUploadManager: Object
  },
  components: {
    SingleUploadFrame,
    Upload,
    IconCard
  },
  computed: {
    preview () {
      // Preview only for csv (since there is no, "show only first n images").
      return this.task.trainingInformation.dataType === 'csv'
    },
    formatLabels () {
      // Need to upload a sperated file just for the labels
      const uploadLabelFile =
        this.task.trainingInformation.LABEL_ASSIGNMENT !== undefined
      // labels to be displayed. If no labels are available => binary classification => display 1
      const labels = this.task.trainingInformation.LABEL_LIST ?? ['']
      return uploadLabelFile ? ['Features', 'Labels'] : labels
    }
  }
}
</script>
