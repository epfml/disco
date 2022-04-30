<template>
  <model-actor-frame :task="task">
    <template #dataExample>
      <slot name="dataExample" />
    </template>
    <template #action>
      <!-- Upload File -->
      <div class="relative">
        <dataset-input-frame
          v-if="tester.fileUploadManager"
          :id="id"
          :task="task"
        />
      </div>

      <!-- Test Button -->
      <div class="flex items-center justify-center p-4">
        <custom-button
          :center="true"
          @click="tester.testModel(downloadPredictions)"
        >
          Test
        </custom-button>
      </div>
      <!-- Display predictions -->
      <slot name="predictionResults" />
    </template>
  </model-actor-frame>
</template>

<script>
import DatasetInputFrame from '../dataset_input/DatasetInputFrame.vue'
import CustomButton from '../simple/CustomButton.vue'

import { Tester } from '../../testing/tester'
import { Task } from 'discojs'

export default {
  name: 'TestingFrame',
  components: {
    DatasetInputFrame,
    CustomButton
  },
  props: {
    id: {
      type: String,
      default: ''
    },
    task: {
      type: Task,
      default: undefined
    }
  },
  data () {
    return {
      predictions: null,
      tester: new Tester(this.task, this.$toast, this.helper)
    }
  },

  methods: {
    async downloadPredictions (csvContent, fileName = 'predictions.csv') {
      // artificially creates a <a> tag to simulate click event and triger download
      const downloadLink = document.createElement('a')
      const blob = new Blob(['\ufeff', csvContent])
      const url = URL.createObjectURL(blob)
      downloadLink.href = url
      downloadLink.download = fileName
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      this.$toast.success('Predictions have been downloaded.')
      setTimeout(this.$toast.clear, 30000)
    }
  }
}
</script>
