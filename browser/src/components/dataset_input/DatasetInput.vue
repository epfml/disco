<template>
  <div class="grid grid-cols-1">
    <IconCard
      v-if="task.trainingInformation.dataType === 'tabular'"
      class="justify-self-center w-full"
    >
      <template #title>
        My dataset
      </template>
      <template #icon>
        <Upload />
      </template>
      <template #content>
        <FileSelection
          :preview="preview"
          @input="addFiles($event)"
          @clear="clearFiles()"
        />
      </template>
    </IconCard>
    <div
      v-else-if="task.trainingInformation.dataType === 'image'"
      class="grid grid-cols-2"
    >
      <div
        v-if="requireLabels"
        class="contents"
      >
        <IconCard
          v-for="label in task.trainingInformation.LABEL_LIST"
          :key="label"
        >
          <template #title>
            Label: {{ label }}
          </template>
          <template #content>
            <FileSelection
              :preview="preview"
              @input="addFiles($event, label)"
              @clear="clearFiles(label)"
            />
          </template>
        </IconCard>
      </div>
      <FileSelection
        v-else
        :preview="preview"
        @input="addFiles($event)"
        @clear="clearFiles()"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Upload from '@/assets/svg/Upload.vue'
import IconCard from '@/components/containers/IconCard.vue'
import FileSelection from './FileSelection.vue'

import { isTask, dataset } from 'discojs'

export default {
  name: 'DatasetInput',
  components: {
    FileSelection,
    Upload,
    IconCard
  },
  props: {
    task: {
      validator: isTask,
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
    }
  },
  methods: {
    addFiles (files: FileList, label?: string) {
      this.$emit('add-files', files, label)
    },
    clearFiles (label?: string) {
      this.$emit('clear-files', label)
    }
  }
}
</script>
