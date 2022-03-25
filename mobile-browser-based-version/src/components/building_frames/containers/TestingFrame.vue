<template>
  <model-actor-frame :task="task">
    <template v-slot:dataExample><slot name="dataExample"></slot></template>
    <template v-slot:action>
      <!-- Upload File -->
      <div class="relative">
        <dataset-input-frame
          :id="id"
          :task="task"
          :fileUploadManager="tester.fileUploadManager"
          v-if="tester.fileUploadManager"
        />
      </div>

      <!-- Test Button -->
      <div class="flex items-center justify-center p-4">
        <custom-button
          @click="tester.testModel(downloadPredictions)"
          :center="true"
        >
          Test
        </custom-button>
      </div>
      <!-- Display predictions -->
      <slot name="predictionResults"></slot>
    </template>
  </model-actor-frame>
</template>

<script>
import DatasetInputFrame from '../upload/DatasetInputFrame.vue'
import CustomButton from '../../simple/CustomButton.vue'
import ModelActorFrame from './ModelActorFrame.vue'

import { Tester } from '../../../core/testing/tester'

export default {
  name: 'TestingFrame',
  props: {
    id: String,
    task: Object,
    helper: Object
  },
  components: {
    ModelActorFrame,
    DatasetInputFrame,
    CustomButton
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
