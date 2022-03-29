<template>
  <icon-card header="Upload my data">
    <template #icon>
      <upload />
    </template>
    <template #extra>
      <div
        v-for="item in getDataTypes"
        :key="item"
      >
        <file-selection-frame
          :id="id"
          :task="task"
          :file-upload-manager="fileUploadManager"
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
import FileSelectionFrame from './FileSelectionFrame.vue'
export default {
  name: 'DatasetInputFrame',
  components: {
    FileSelectionFrame,
    Upload,
    IconCard
  },
  props: {
    id: {
      type: String,
      default: ''
    },
    task: {
      type: Object,
      default: undefined
    },
    fileUploadManager: {
      type: Object,
      default: undefined
    }
  },
  computed: {
    preview () {
      // Preview only for csv (since there is no, "show only first n images").
      return this.task.trainingInformation.dataType === 'csv'
    },
    /**
     * Returns a list of the data that the user needs to upload, if the user does not require to upload a labels file,
     * then for example:
     *
     * mnist: returns ['0', '1', ..., '9']
     *
     * If however labels are required separately then:
     *
     * cifar-10: returns ['Images', 'Labels']
     *
     * TODO: this is hard coded, currently we only support csv or images, so only for images does a separate label file make sense.
     * Also note, we are mixing data types: Images, Labels, with labels: 0, 1, 2... (for cifar). This should be improved.
     */
    getDataTypes () {
      // labels to be displayed. If no labels are available => binary classification => display 1
      const labels = this.task.trainingInformation.LABEL_LIST ?? ['']
      const imagesAndLabels = ['Images', 'Labels']
      return this.taskRequiresToUploadLabelFile() ? imagesAndLabels : labels
    }
  },
  methods: {
    /**
     * Returns true if the user needs to add a separate file with labels.
     *
     * mnist: false, since per label there is a single upload frame where the user must add images.
     *
     * cifar-10: true, the user needs to add both images and a csv file with the labels of these images.
     *
     */
    taskRequiresToUploadLabelFile () {
      return this.task.trainingInformation.LABEL_ASSIGNMENT !== undefined
    }
  }
}
</script>
