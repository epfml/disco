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
import { DatasetBuilder } from '../../../core/dataset/dataset_builder'
import { ImageLoader } from '../../../core/dataset/data_loader/image_loader'

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
    this.datasetBuilder = new DatasetBuilder(new ImageLoader())
  }
}
</script>
