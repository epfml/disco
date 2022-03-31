<template>
  <icon-card header="Upload my data">
    <template v-slot:icon><upload /></template>
    <template v-slot:extra>
      <div v-if="requireLabelFiles">
        <div v-if="task.trainingInformation.dataType === 'tabular'">
          <file-selection-frame
            :id="id"
            :preview="preview"
            :sourceType="dataset"
            @input="addFiles(dataset, $event)"
            @clear="clearFiles(dataset)"
          />
        </div>
        <div v-else>
          <file-selection-frame
            :id="id"
            :preview="preview"
            :sourceType="samples"
            @input="addFiles(samples, $event)"
            @clear="clearFiles(samples)"
          />
          <file-selection-frame
            :id="id"
            :preview="preview"
            :sourceType="labels"
            @input="addFiles(labels, $event)"
            @clear="clearFiles(labels)"
          />
        </div>
      </div>
      <div v-else>
        <file-selection-frame
          :id="id"
          :preview="preview"
          :sourceType="samples"
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
  name: 'dataset-input-frame',
  props: {
    id: String,
    task: Task,
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
      return this.task.trainingInformation.dataType === 'tabular'
    },
    requireLabelFiles () {
      // return this.task.trainingInformation.LABEL_ASSIGNMENT !== undefined
      return true
    }
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
  },
  created () {
    // For some reason, the template does not understand direct accesses to the enum
    this.samples = SourceType.SAMPLES
    this.labels = SourceType.LABELS
    this.dataset = SourceType.DATASET
  }
}
</script>
