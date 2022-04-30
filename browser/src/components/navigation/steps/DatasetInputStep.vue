<template>
  <div>
    <DatasetInputFrame
      :id="id"
      :task="task"
      :dataset-builder="datasetBuilder"
    />
    <div class="flex items-center justify-center">
      <CustomButton
        :center="true"
        @click="nextStep"
      >
        Start Training
      </CustomButton>
    </div>
  </div>
</template>

<script lang="ts">
import DatasetInputFrame from '@/components/dataset_input/DatasetInputFrame.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

import { dataset, Task } from 'discojs'

export default {
  name: 'DatasetInputStep',
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
    },
    datasetBuilder: {
      type: dataset.DatasetBuilder,
      default: undefined
    }
  },
  computed: {
    available (): boolean {
      return !this.datasetBuilder.isBuilt()
    }
  },
  methods: {
    nextStep (): void {
      this.$emit('next-step')
    },
    prevStep (): void {
      this.$emit('prev-step')
    }
  }
}
</script>
