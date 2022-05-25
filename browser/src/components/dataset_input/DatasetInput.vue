<template>
  <IconCard header="My dataset">
    <template #icon>
      <Upload />
    </template>
    <template #extra>
      <div v-if="task.trainingInformation.dataType === 'tabular'">
        <FileSelection
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
              :preview="preview"
              :allowed="allowed"
              @input="addFiles($event, label)"
              @clear="clearFiles(label)"
              @fail="fail()"
            />
          </div>
        </div>
        <div v-else>
          <FileSelection
            :preview="preview"
            :allowd="allowed"
            @input="addFiles($event)"
            @clear="clearFiles()"
            @fail="fail()"
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
