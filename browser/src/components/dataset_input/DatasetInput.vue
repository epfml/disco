<template>
  <IconCard header="My dataset">
    <template #icon>
      <Upload />
    </template>
    <template #extra>
      <div v-if="task.trainingInformation.dataType === 'tabular'">
        <FileSelection
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
            <FileSelection
              :id="id"
              :preview="preview"
              @input="addFiles($event, label)"
              @clear="clearFiles(label)"
            />
          </div>
        </div>
        <div v-else>
          <FileSelection
            :id="id"
            :preview="preview"
            @input="addFiles($event)"
            @clear="clearFiles()"
          />
        </div>
      </div>
    </template>
  </IconCard>
</template>

<script lang="ts">
import Upload from '@/assets/svg/Upload.vue'
import IconCard from '@/components/containers/IconCard.vue'
import FileSelection from './FileSelection.vue'

import { Task, dataset } from 'discojs'

export default {
  name: 'DatasetInput',
  components: {
    FileSelection,
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
    preview (): boolean {
      // Preview only for csv (since there is no, "show only first n images").
      return this.task.trainingInformation.dataType === 'tabular'
    },
    requireLabels (): boolean {
      return this.task.trainingInformation.LABEL_LIST !== undefined
    },
    completed (): boolean {
      return this.datasetBuilder.size() > 0
    }
  },
  watch: {
    completed (newValue): void {
      if (newValue) {
        this.$emit('completed')
      }
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
