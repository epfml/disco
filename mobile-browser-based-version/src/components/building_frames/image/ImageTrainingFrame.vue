<template>
  <training-frame :id="id" :task="task" :datasetBuilder="datasetBuilder">
    <template v-slot:dataExample>
      <!-- Data Point Example -->
      <div class="flex object-center">
        <img
          class="object-center"
          :src="task.getExampleImage(task.displayInformation.dataExampleImage)"
          :alt="task.displayInformation.dataExampleImage"
        /><img />
      </div>
    </template>
    <template v-slot:extra></template>
  </training-frame>
</template>

<script>
import TrainingFrame from '../containers/TrainingFrame.vue'
import { DatasetBuilder } from '../../../logic/NEW_data_pipeline/dataset_builder'
import { ImageReadOperator } from '../../logic/NEW_data_pipeline/read_operators/image_read_operator'

export default {
  name: 'image-training-frame',
  props: {
    id: String,
    task: Object
  },
  components: {
    TrainingFrame
  },
  mounted () {
    this.datasetBuilder = new DatasetBuilder(new ImageReadOperator())
  }
}
</script>
