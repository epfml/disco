<template>
  <icon-card header="Upload my data">
    <template #icon>
      <upload />
    </template>
    <template #extra>
      <div v-if="requireLabelFiles">
        <div v-if="task.trainingInformation.dataType === 'tabular'">
          <file-selection-frame
            :id="id"
            :preview="preview"
            :source-type="dataset"
            @input="addFiles(dataset, $event)"
            @clear="clearFiles(dataset)"
          />
        </div>
        <div v-else-if="task.trainingInformation.dataType === 'image'">
          <file-selection-frame
            :id="id"
            :preview="preview"
            :source-type="samples"
            @input="addFiles(samples, $event)"
            @clear="clearFiles(samples)"
          />
          <file-selection-frame
            :id="id"
            :preview="preview"
            :source-type="labels"
            @input="addFiles(labels, $event)"
            @clear="clearFiles(labels)"
          />
        </div>
      </div>
      <div v-else>
        <file-selection-frame
          :id="id"
          :preview="preview"
          :source-type="samples"
          @input="addFiles(samples, $event)"
          @clear="clearFiles(samples)"
        />
      </div>
    </template>
  </icon-card>
</template>

<script lang="ts">
import { SourceType } from '../../../core/dataset/source_type'
import Upload from '../../../assets/svg/Upload.vue'
import IconCard from '../../containers/IconCard.vue'
import FileSelectionFrame from './FileSelectionFrame.vue'
import { DatasetBuilder } from '../../../core/dataset/dataset_builder'
import { Task } from '../../../core/task/task'

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
      type: Task,
      default: undefined
    },
    datasetBuilder: {
      type: DatasetBuilder,
      default: undefined
    }
  },
  computed: {
    preview () {
      // Preview only for csv (since there is no, "show only first n images").
      return this.task.trainingInformation.dataType === 'tabular'
    },
    requireLabels () {
      const dataType = this.task.trainingInformation.dataType
      return dataType === 'tabular' || (dataType === 'image' && this.task.trainingInformation.LABEL_ASSIGNMENT !== undefined)
    }
  },
  created () {
    // For some reason, the template does not understand direct accesses to the SourceType enum
    this.samples = SourceType.SAMPLES
    this.labels = SourceType.LABELS
    this.dataset = SourceType.DATASET
  },
  methods: {
    addFiles (sourceType: SourceType, files: FileList) {
      if (!this.datasetBuilder.isBuilt()) {
        this.datasetBuilder.addFiles(sourceType, Array.from(files))
      }
    },
    clearFiles (sourceType: SourceType) {
      if (!this.datasetBuilder.isBuilt()) {
        this.datasetBuilder.clearFiles(sourceType)
      }
    }
  }
}
</script>
