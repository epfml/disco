<template>
  <action-frame :task="task">
    <template v-slot:dataExample><slot name="dataExample"></slot></template>
    <template v-slot:action>
      <!-- Upload File -->
      <div class="relative">
        <uploading-frame
          v-bind:id="id"
          v-bind:task="task"
          v-bind:fileUploadManager="tester.fileUploadManager"
          v-if="tester.fileUploadManager"
          :displayLabels="false"
        />
      </div>

      <!-- Test Button -->
      <div class="flex items-center justify-center p-4">
        <custom-button
          v-on:click="tester.testModel(downloadPredictions)"
          :center="true"
        >
          Test
        </custom-button>
      </div>
      <!-- Display predictions -->
      <slot name="predictionResults"></slot>
    </template>
  </action-frame>
</template>

<script>
import UploadingFrame from '../upload/UploadingFrame.vue';
import CustomButton from '../../simple/CustomButton.vue';
import ActionFrame from './ActionFrame.vue';

import { Tester } from '../../../helpers/testing/tester.js';

export default {
  name: 'TestingFrame',
  props: {
    id: String,
    task: Object,
    helper: Object,
  },
  components: {
    ActionFrame,
    UploadingFrame,
    CustomButton,
  },
  data() {
    return {
      predictions: null,
      tester: new Tester(this.task, this.$toast, this.helper),
    };
  },

  methods: {
    async downloadPredictions(csvContent, fileName = 'predictions.csv') {
      // artificially creates a <a> tag to simulate click event and triger download
      var downloadLink = document.createElement('a');
      var blob = new Blob(['\ufeff', csvContent]);
      var url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      this.$toast.success(`Predictions have been downloaded.`);
      setTimeout(this.$toast.clear, 30000);
    },
  },
};
</script>
