<template>
  <icon-card header="Upload my data">
    <template v-slot:icon><upload /></template>
    <template v-slot:extra>
      <div v-if="requireLabelFiles">
        <div v-if="task.trainingInformation.SourceType === 'text'">
          <file-selection-frame
            :id="id"
            :preview="preview"
            :sourceType="SourceType.DATASET"
            @input="addFiles(SourceType.DATASET, $event)"
            @clear="clearFiles(SourceType.DATASET)"
          />
        </div>
        <div v-else>
          <file-selection-frame
            :id="id"
            :preview="preview"
            :sourceType="SourceType.SAMPLES"
            @input="addFiles(SourceType.SAMPLES, $event)"
            @clear="clearFiles(SourceType.SAMPLES)"
          />
          <file-selection-frame
            :id="id"
            :preview="preview"
            :sourceType="SourceType.LABELS"
            @input="addFiles(SourceType.LABELS, $event)"
            @clear="clearFiles(SourceType.LABELS)"
          />
        </div>
      </div>
      <div v-else>
        <file-selection-frame
          :id="id"
          :preview="preview"
          :sourceType="SourceType.SAMPLES"
          @input="addFiles(SourceType.SAMPLES, $event)"
          @clear="clearFiles(SourceType.SAMPLES)"
        />
      </div>
    </template>
  </icon-card>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import { SourceType } from '../../../core/dataset/source_type'
import Upload from '../../../assets/svg/Upload.vue'
import IconCard from '../../containers/IconCard.vue'
import FileSelectionFrame from './FileSelectionFrame.vue'
import DatasetBuilder from '../../../core/dataset/dataset_builder'
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
  computed: {
    preview () {
      // Preview only for csv (since there is no, "show only first n images").
      return this.task.trainingInformation.sourceType === 'text'
    },
    requireLabelFiles () {
      return this.task.trainingInformation.LABEL_ASSIGNMENT !== undefined
    }
  },
  methods: {
    addFiles (sourceType, files) {
      if (!this.datasetBuilder.isBuilt()) {
        /**
         * Convert the FileList object to an array of URL strings
         */
        const sources = _.map(files, URL.createObjectURL)
        this.datasetBuilder.addFiles(sourceType, sources)
      }
    },
    clearFiles (sourceType) {
      if (!this.datasetBuilder.isBuilt()) {
        this.datasetBuilder.clearFiles(sourceType)
      }
    }
  }
}
</script>
