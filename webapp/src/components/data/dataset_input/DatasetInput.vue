<!--
  DatasetInput is a component used to connect data to DISCO before training, evaluation and prediction
  Its behavior is different depending on the type of data and whether it is used for training of inference
-->
<template>
  <div class="grid grid-cols-1">
    <IconCard
      class="justify-self-center w-full"
    >
      <template #title> Connect your data </template>
      <template #icon> <PlugIcon /> </template>

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
        v-if="isOnlyPrediction"
        @csv="setCsv($event)"
        :is-multiple="false"
        :dataset-builder="props.datasetBuilder"
        :task="props.task"
        :csv-rows="csvRows"
      />
      <FileSelection
        v-else-if="task.trainingInformation.dataType === 'text'"
        @csv="setCsv($event)"
        :is-multiple="false"
        :dataset-builder="props.datasetBuilder"
        :task="props.task"
        :csv-rows="csvRows"
      />
      <FileSelection
        v-else-if="task.trainingInformation.dataType === 'tabular'"
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
      <!-- If we are training or evaluating and need labels -->
        <div
          v-if="requireLabels"
          class="contents"
        >
          <IconCard
            v-for="label in task.trainingInformation.LABEL_LIST"
            :key="label"
          >
            <template #title> Group label:&nbsp;&nbsp;{{ label }} </template>

            <FileSelection
              :label="label"
              :is-multiple="true"
              :info-text="true"
              :dataset-builder="props.datasetBuilder"
              :task="props.task"
              :csv-rows="csvRows"
              @csv="setCsv($event)"
            >
              <template #text>
                {{ browsingTip }}
              </template>
            </FileSelection>
          </IconCard>
        </div>
        <!-- If it's for inference and we don't need labels -->
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
                extension. You can find an example of how to create a CSV <a class='underline text-blue-400' target="_blank" href='https://github.com/epfml/disco/blob/develop/docs/examples/dataset_csv_creation.ipynb'>here</a>.
              </template>
            </FileSelection>
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
            <template #title> Connect the images </template>

            <FileSelection
              :is-directory="true"
              :info-text="true"
              :dataset-builder="props.datasetBuilder"
              :task="props.task"
              :csv-rows="csvRows"
              @csv="setCsv($event)"
            >
              <template #text>
                Drag and drop or browse for the images referenced in the connected CSV file.
                <br/>{{ browsingTip }}
              </template>
            </FileSelection>
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
  isOnlyPrediction: boolean //is true when predicting with a trained model
}
const props = defineProps<Props>()

const browsingTip = "Tip: when browsing files you can use the keyboard shortcut Ctrl + A to select all images."
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
