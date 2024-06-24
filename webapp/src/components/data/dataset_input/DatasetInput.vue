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
        <PlugIcon />
      </template>
      <template #content>
        <div class="mb-5 text-left" v-show="props.task.displayInformation.sampleDatasetLink !== undefined">
            <b>Don't have any data?</b> You can download an example dataset <a  class='underline' :href="props.task.displayInformation.sampleDatasetLink">here</a>.
            <br/> {{ props.task.displayInformation.sampleDatasetInstructions?? '' }}
        </div>
        <div class="mb-5 text-left">
          Disco needs to know where your data is located on your device in order to read it (<b>not</b> upload it!) and train models.
          Models are trained on your local data and are periodically aggregated with other users' models if any.
          <br/><br/><b>Your data stays on your device and data is never uploaded anywhere.</b>
        </div>
        <div 
          v-if="task.trainingInformation.dataType === 'image' "
          class="mb-5 text-left"
        >
          You can connect images by selecting the location of each data category (Group) or by submitting a csv file (CSV).
        </div>
        <!-- If the task data type is tabular, text or if we are doing inference only, then display a single drag and drop box -->
        <FileSelection
          v-if="task.trainingInformation.dataType === 'text' || isOnlyPrediction"
          @csv="setCsv($event)"
          :is-multiple="false"
          :dataset-builder="props.datasetBuilder"
          :task="props.task"
          :csv-rows="csvRows"
        />
        <FileSelection
          v-if="task.trainingInformation.dataType === 'tabular' || isOnlyPrediction"
          @csv="setCsv($event)"
          :is-multiple="false"
          :dataset-builder="props.datasetBuilder"
          :task="props.task"
          :csv-rows="csvRows"
          :expect-csv-mapping="false"
        />
        <!--
          If the task data type is image then let the user choose between connect a csv and all images at once
          or connecting image groups by categories
        -->
        <div 
          v-else-if="task.trainingInformation.dataType === 'image'"
          class="flex justify-center"
        >
        <!-- The default data selection mode (connect by group vs connect a csv) depends on task' label number
        If the task has few labels then the default is to connect by group, otherwise connecting a CSV is the default -->
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
    <!-- Connecting images by group mode -->
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
                :label="label"
                :dataset-builder="props.datasetBuilder"
                :task="props.task"
                :csv-rows="csvRows"
                @csv="setCsv($event)"
              />
            </template>
          </IconCard>
        </div>
        <FileSelection
          v-else
          :dataset-builder="props.datasetBuilder"
          :task="props.task"
          :csv-rows="csvRows"
          @csv="setCsv($event)"
        />
      </div>
    <!-- Connecting images by CSV mode -->
      <div
        v-show="!connectImagesByGroup"
        class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8"
      >
        <div v-if="requireLabels">
          <IconCard title-placement="center">
            <template #title>
              Connect the CSV file containing a mapping between images and labels
            </template>
            <template #content>
              <FileSelection
                :accept-files="['.csv']"
                :is-multiple="false"
                :info-text="true"
                :dataset-builder="props.datasetBuilder"
                :task="props.task"
                :csv-rows="csvRows"
                :expect-csv-mapping="true"
                @csv="setCsv($event)"
              >
                <template #text>
                  <b>The CSV file must contain a header with only two columns (filename, label)</b>. The file name must NOT include the file
                  extension. You can find an example of how to create a CSV <a class='underline text-primary-dark dark:text-primary-light' href='https://github.com/epfml/disco/blob/develop/docs/examples/dataset_csv_creation.ipynb'>here</a>.
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
              Connect the images
            </template>
            <template #content>
              <FileSelection
                :is-directory="true"
                :info-text="true"
                :dataset-builder="props.datasetBuilder"
                :task="props.task"
                :csv-rows="csvRows"
                @csv="setCsv($event)"
              >
                <template #text>
                  Either drag and drop the <b>images</b> directly or select the <b>folder</b> containing all the images referenced in the connected CSV file.
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

import type { Task } from '@epfml/discojs'
import { data } from '@epfml/discojs'

import PlugIcon from '@/assets/svg/PlugIcon.vue'
import IconCard from '@/components/containers/IconCard.vue'
import FileSelection from './FileSelection.vue'

interface Props {
  task: Task
  datasetBuilder: data.DatasetBuilder<File>
  isOnlyPrediction: boolean //TODO: seems to always be false
}

const props = defineProps<Props>()

const csvRows = ref<{ filename: string, label: string }[]>()

const isLabelLengthSmall = (props.task.trainingInformation.LABEL_LIST?.length ?? 0) <= 2
const connectImagesByGroup = ref(isLabelLengthSmall)

const requireLabels = computed(
  () => props.task.trainingInformation.LABEL_LIST !== undefined
)

const cannotUploadFiles = computed(
  () => requireLabels.value && !csvRows.value
)

function setCsv(csv: { filename: string, label: string }[] | undefined) {
  csvRows.value = csv
}

</script>
