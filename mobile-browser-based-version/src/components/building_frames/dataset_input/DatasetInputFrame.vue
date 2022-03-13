<template>
  <icon-card header="Upload my data">
    <template v-slot:icon><upload /></template>
    <template v-slot:extra>
      <file-selection-frame
        :id="id"
        :preview="preview"
        :dataType="SAMPLES"
        @input="addFiles(SAMPLES, $event)"
        @clear="clearFiles(SAMPLES)"
      />
      <file-selection-frame
        :id="id"
        :preview="preview"
        :dataType="LABELS"
        @input="addFiles(LABELS, $event)"
        @clear="clearFiles(LABELS)"
        v-if="requireLabelFiles"
      />
    </template>
  </icon-card>
</template>

<script>
import { SAMPLES, LABELS } from '../../../logic/new_data_pipeline/data_type'
import Upload from '../../../assets/svg/Upload.vue'
import IconCard from '../../containers/IconCard.vue'
import FileSelectionFrame from './FileSelectionFrame.vue'
import DatasetBuilder from '../../../logic/NEW_data_pipeline'
import _ from 'lodash'

export default {
  name: 'dataset-input-frame',
  props: {
    id: String,
    task: Object,
    datasetBuilder: DatasetBuilder
  },
  components: {
    FileSelectionFrame,
    Upload,
    IconCard
  },
  data () {
    return {
      sampleFiles: [],
      labelFiles: []
    }
  },
  computed: {
    preview () {
      // Preview only for csv (since there is no, "show only first n images").
      return this.task.trainingInformation.dataType === 'csv'
    },
    requireLabelFiles () {
      return this.task.trainingInformation.LABEL_ASSIGNMENT !== undefined
    }
  },
  methods: {
    addFiles (dataType, files) {
      switch (dataType) {
        case SAMPLES:
          _.forEach(files, file => this.sampleFiles.push(file))
          break
        case LABELS:
          _.forEach(files, file => this.labelFiles.push(file))
          break
        default:
          break
      }
    },
    clearFiles (dataType) {
      switch (dataType) {
        case SAMPLES:
          this.sampleFiles = []
          break
        case LABELS:
          this.labelFiles = []
          break
        default:
          break
      }
    }
  }
}
</script>
