<template>
  <div class="grid grid-cols-1">
    <IconCard
      v-if="['tabular', 'text'].includes(task.trainingInformation.dataType) || isOnlyPrediction"
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
      v-else-if="task.trainingInformation.dataType === 'image'"
      class="space-y-4 md:space-y-8"
    >
      <div class="flex justify-center">
        <IconCard title-placement="center">
          <template #title>
            Select labels by
          </template>
          <template #content>
            <div class="inline-flex">
              <button
                class="w-40 py-2 uppercase text-lg rounded-l-lg border-2 border-disco-cyan focus:outline-none"
                :class="!isBoxView ? 'text-white bg-disco-cyan' : 'text-disco-cyan bg-transparent'"
                @click="isBoxView = false"
              >
                csv
              </button>
              <button
                class="w-40 py-2 uppercase text-lg rounded-r-lg border-2 border-disco-cyan focus:outline-none"
                :class="isBoxView ? 'text-white bg-disco-cyan' : 'text-disco-cyan bg-transparent'"
                @click="isBoxView = true"
              >
                group
              </button>
            </div>
          </template>
        </IconCard>
      </div>

      <div
        v-show="isBoxView"
        class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8"
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
              Group label:&nbsp;&nbsp;&nbsp;"{{ label }}"
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
      <div
        v-show="!isBoxView"
        class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8"
      >
        <div v-if="requireLabels">
          <IconCard title-placement="center">
            <template #title>
              Load the CSV file containing a mapping between images and labels
            </template>
            <template #content>
              <FileSelection
                :accept-files="['.csv']"
                :is-multiple="false"
                :info-text="true"
                @input="readCsv($event)"
                @clear="clearCsv()"
              >
                <template #text>
                  The CSV file must contain a header with only two columns (file name, label). The file name must NOT include the file
                  extension.
                </template>
              </FileSelection>
            </template>
          </IconCard>
        </div>

        <div
          :class="{'border-disco-cyan rounded-xl border-2': cannotUploadFiles}"
          class="relative"
        >
          <div
            v-if="cannotUploadFiles"
            class="w-full h-full absolute z-20 cursor-not-allowed grid place-content-center"
          >
            <div class="text-disco-cyan font-bold text-2xl">
              Upload CSV first
            </div>
          </div>
          <IconCard
            title-placement="center"
            :class="{'opacity-10': cannotUploadFiles}"
          >
            <template #title>
              Load the folder containing all images
            </template>
            <template #content>
              <FileSelection
                :is-directory="true"
                :info-text="true"
                @input="addFiles($event)"
                @clear="clearFiles()"
              >
                <template #text>
                  Select a folder containing all images contained in the selected CSV file.
                </template>
              </FileSelection>
            </template>
          </IconCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import * as d3 from 'd3'

import type { Task } from '@epfml/discojs-core'
import { data } from '@epfml/discojs-core'

import Upload from '@/assets/svg/Upload.vue'
import IconCard from '@/components/containers/IconCard.vue'
import FileSelection from './FileSelection.vue'

interface Props {
  task: Task
  datasetBuilder: data.DatasetBuilder<File>
  isOnlyPrediction: Boolean
}

const props = defineProps<Props>()

const csvRows = ref<{ filename: string, label: string }[]>()
const isBoxView = ref<boolean>(false)

const requireLabels = computed(
  () => props.task.trainingInformation.LABEL_LIST !== undefined
)

const cannotUploadFiles = computed(
  () => requireLabels.value && !csvRows.value
)

const readCsv = (files: FileList) => {
  files[0].text().then(file => { csvRows.value = d3.csvParse(file) })
}

const addFiles = (files: FileList, label?: string) => {
  const filesArray = Array.from(files)

  if (props.task.trainingInformation.dataType === 'image' && requireLabels.value && !props.isOnlyPrediction) {
    if (label) {
      props.datasetBuilder.addFiles(filesArray, label)
    } else {
      if (csvRows.value === undefined) {
        throw new Error('adding files but not CSV rows defined')
      }

      csvRows.value.forEach(row => {
        const imageFile = filesArray.find(file => row.filename === file.name.split('.').slice(0, -1).join('.'))
        if (imageFile) {
          props.datasetBuilder.addFiles([imageFile], row.label)
        }
      })
    }
  } else {
    props.datasetBuilder.addFiles(filesArray)
  }
}

const clearCsv = () => {
  csvRows.value = undefined
}

const clearFiles = (label?: string) => props.datasetBuilder.clearFiles(label)
</script>
