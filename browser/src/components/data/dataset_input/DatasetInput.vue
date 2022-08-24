<template>
  <div class="grid grid-cols-1">
    <IconCard
      v-if="task.dataInformation.type === DataType.TABULAR"
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
          @input="addFiles($event)"
          @clear="clearFiles()"
        />
      </template>
    </IconCard>
    <div
      v-else-if="task.dataInformation.type === DataType.IMAGE"
      class="grid grid-cols-1 lg:grid-cols-2"
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
              @input="addFiles($event, label)"
              @clear="clearFiles(label)"
            />
          </template>
        </IconCard>
      </div>
      <FileSelection
        v-else
        @input="addFiles($event)"
        @clear="clearFiles()"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineProps } from 'vue'

import { dataset, Task, DataType } from '@epfml/discojs'

import Upload from '@/assets/svg/Upload.vue'
import IconCard from '@/components/containers/IconCard.vue'
import FileSelection from './FileSelection.vue'

interface Props {
  task: Task
  datasetBuilder: dataset.DatasetBuilder<File>
}
const props = defineProps<Props>()

const requireLabels = computed(() => props.task.trainingInformation.LABEL_LIST !== undefined)

const addFiles = (files: FileList, label?: string) => props.datasetBuilder.addFiles(Array.from(files), label)
const clearFiles = (label?: string) => props.datasetBuilder.clearFiles(label)
</script>
