<!-- 
  DatasetInput is a component used to connect data to DISCO before training, evaluation and prediction
  Its behavior is different depending on the type of data and whether it is used for training of inference
-->
<template>
  <div class="grid grid-cols-1">
    <IconCard
      class="justify-self-center w-full"
    >
      <template #title>
        Connect your data
      </template>
      <template #icon>
        <Upload />
      </template>
      <template #content>
        <div  class="mb-5 text-left" v-show="props.task.displayInformation.sampleDatasetLink !== undefined">
            <b>Don't have any data?</b> You can download a dataset <a  class='underline' :href="props.task.displayInformation.sampleDatasetLink">here</a>.
          </div>
          <div class="mb-5 text-left">
            Disco needs to know where your data is located to train models. You can connect them by selecting the location of each data category or by submitting a csv file.
            Models are trained on your local data and are periodically aggregated with other users' models.
            <br/><br/><b>Your data stays private and is never uploaded online.</b>
          </div>
        <!-- If the task data type is tabular, text or if we are doing inference only, then display a single drag and drop box -->
        <FileSelection
          v-if="['tabular', 'text'].includes(task.trainingInformation.dataType) || isOnlyPrediction"
          @input="addFiles($event)"
          @clear="clearFiles()"
        />
        <!--
          If the task data type is image then let the user choose between uploading a csv and all images at once
          or uploading image groups by categories
        -->
        <div 
          v-else-if="task.trainingInformation.dataType === 'image'"
          class="flex justify-center"
        >
              <button
                class="w-40 py-2 uppercase text-lg rounded-l-lg border-2 border-disco-cyan focus:outline-none"
                :class="connectImagesByGroup ? 'text-white bg-disco-cyan' : 'text-disco-cyan bg-transparent'"
                @click="connectImagesByGroup = true"
              >
                group
              </button>
              <button
                class="w-40 py-2 uppercase text-lg rounded-r-lg border-2 border-disco-cyan focus:outline-none"
                :class="!connectImagesByGroup ? 'text-white bg-disco-cyan' : 'text-disco-cyan bg-transparent'"
                @click="connectImagesByGroup = false"
              >
                csv
              </button>
            </div>
      </template>
    </IconCard>
    <div
      v-if="task.trainingInformation.dataType === 'image'"
      class="space-y-4 md:space-y-8 mt-8"
    >
      <div
        v-show="connectImagesByGroup"
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
              Group label:&nbsp;&nbsp;{{ label }}
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
        v-show="!connectImagesByGroup"
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
                  <b>The CSV file must contain a header with only two columns (filename, label)</b>. The file name must NOT include the file
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

import type { Task } from '@epfml/discojs'
import { data } from '@epfml/discojs'

import Upload from '@/assets/svg/Upload.vue'
import IconCard from '@/components/containers/IconCard.vue'
import FileSelection from './FileSelection.vue'
import { useToaster } from '@/composables/toaster'

interface Props {
  task: Task
  datasetBuilder: data.DatasetBuilder<File>
  isOnlyPrediction: Boolean //TODO: seems to always be false
}
const toaster = useToaster()

const props = defineProps<Props>()

const csvRows = ref<{ filename: string, label: string }[]>()
const connectImagesByGroup = ref(true)

const requireLabels = computed(
  () => props.task.trainingInformation.LABEL_LIST !== undefined
)

const cannotUploadFiles = computed(
  () => requireLabels.value && !csvRows.value
)

const readCsv = (files: FileList) => {
  files[0].text().then(file => {
    csvRows.value = d3.csvParse(file)
    if (csvRows.value[0].filename == undefined || csvRows.value[0].label == undefined) {
      clearCsv()
      toaster.error("The CSV file should have a header with the exact column names: filename, label.")
      throw new Error("Invalid CSV header")
    }
  })
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
      try {
        csvRows.value.forEach(row => {
          // Match the selected files with the csv file names and label
          const imageFile = filesArray.find(file => row.filename === file.name.split('.').slice(0, -1).join('.'))
          if (imageFile === undefined) {
            toaster.error("Images specified in the CSV file are missing, make sure the CSV filenames don't include file extensions.")
            throw new Error("Image not found in the CSV file")
          } else if (imageFile) {
            props.datasetBuilder.addFiles([imageFile], row.label)
          }
        })
      } catch (e){
        console.error(e)
      }
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
