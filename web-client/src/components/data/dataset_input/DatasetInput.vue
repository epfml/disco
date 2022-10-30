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
          @input="addFiles($event)"
          @clear="clearFiles()"
        />
      </template>
    </IconCard>
    <div
      v-else-if="task.trainingInformation.dataType === 'image'"
    >
      <div class="flex flex-col items-center">
        <span class="text-disco-cyan mb-2 font-bold">Select by</span>
        <div
          class="inline-flex rounded-md mb-5"
          role="group"
        >
          <button
            type="button"
            :class="!isBoxView ? 'text-white bg-disco-cyan' : 'text-disco-cyan bg-transparent'"
            class="w-40 py-2 uppercase text-lg font-bold rounded-l-lg border-2 border-disco-cyan focus:outline-none"
            @click="isBoxView = false"
          >
            CSV
          </button>
          <button
            type="button"
            :class="isBoxView ? 'text-white bg-disco-cyan' : 'text-disco-cyan bg-transparent'"
            class="w-40 py-2 uppercase text-lg font-bold rounded-r-md border-2 border-disco-cyan focus:outline-none"
            @click="isBoxView = true"
          >
            Label
          </button>
        </div>
      </div>

      <div
        v-if="isBoxView"
        class="grid grid-cols-1 lg:grid-cols-2 gap-3"
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
      <div
        v-else
        class="grid grid-cols-1 lg:grid-cols-2 gap-3"
      >
        <div
          v-if="requireLabels"
        >
          <IconCard>
            <template #title>
              Load CSV file containing labels
            </template>
            <template #content>
              <FileSelection
                :accept-files="['.csv']"
                :is-multiple="false"
                @input="readCsv($event)"
                @clear="clearCsv()"
              />
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
            :class="{'opacity-10': cannotUploadFiles}"
          >
            <template #title>
              Load folder containing all images
            </template>
            <template #content>
              <FileSelection
                :is-directory="true"
                @input="addFiles($event)"
                @clear="clearFiles()"
              />
            </template>
          </IconCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineProps, ref } from 'vue'

import { dataset, Task, d3 } from '@epfml/discojs'

import Upload from '@/assets/svg/Upload.vue'
import IconCard from '@/components/containers/IconCard.vue'
import FileSelection from './FileSelection.vue'

interface Props {
  task: Task
  datasetBuilder: dataset.DatasetBuilder<File>
}
const props = defineProps<Props>()
const csvRows = ref<{filename: string, label: string}[]>()
const isBoxView = ref<boolean>(false)

const requireLabels = computed(
  () => props.task.trainingInformation.LABEL_LIST !== undefined
)

const cannotUploadFiles = computed(
  () => requireLabels && !csvRows.value
)

const readCsv = (files: FileList) => {
  const file = files[0]
  const fr = new FileReader()
  fr.onload = () => { csvRows.value = d3.csvParse(fr.result.toString()) }
  fr.readAsText(file)
}

const addFiles = (files: FileList, label?: string) => {
  const filesArray = Array.from(files)

  if (requireLabels) {
    if (label) {
      props.datasetBuilder.addFiles(filesArray, label)
    } else {
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

  console.log(props.datasetBuilder.size())
}

const clearCsv = () => {
  csvRows.value = null
}

const clearFiles = (label?: string) => props.datasetBuilder.clearFiles(label)
</script>
