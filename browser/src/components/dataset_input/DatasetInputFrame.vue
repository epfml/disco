<template>
  <icon-card header="My dataset">
    <template #icon>
      <upload />
    </template>
    <template #extra>
      <div v-if="task.trainingInformation.dataType === 'tabular'">
        <file-selection-frame
          :id="id"
          :preview="preview"
          @input="addFiles($event)"
          @clear="clearFiles()"
        />
      </div>
      <div v-else-if="task.trainingInformation.dataType === 'image'">
        <div v-if="requireLabels">
          <div
            v-for="label in task.trainingInformation.LABEL_LIST"
            :key="label"
          >
            <span class="text-xl font-semibold"> {{ label }} </span>
            <file-selection-frame
              :id="id"
              :preview="preview"
              @input="addFiles($event, label)"
              @clear="clearFiles(label)"
            />
          </div>
        </div>
        <div v-else>
          <file-selection-frame
            :id="id"
            :preview="preview"
            @input="addFiles($event)"
            @clear="clearFiles()"
          />
        </div>
      </div>
    </template>
  </icon-card>
</template>

<script lang="ts">
import { Task, dataset } from 'discojs'

import Upload from '../../assets/svg/Upload.vue'
import IconCard from '../containers/IconCard.vue'
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
      type: Task,
      default: undefined
    },
    datasetBuilder: {
      type: dataset.DatasetBuilder,
      default: undefined
    }
  },
  computed: {
    preview () {
      // Preview only for csv (since there is no, "show only first n images").
      return this.task.trainingInformation.dataType === 'tabular'
    },
    requireLabels () {
      return this.task.trainingInformation.LABEL_LIST !== undefined
    }
  },
  methods: {
    addFiles (files: FileList, label?: string) {
      if (!this.datasetBuilder.isBuilt()) {
        this.datasetBuilder.addFiles(Array.from(files), label)
      }
    },
    clearFiles (label?: string) {
      if (!this.datasetBuilder.isBuilt()) {
        this.datasetBuilder.clearFiles(label)
      }
    }
  }
}
</script>
