<template>
  <TrainingFrame
    :id="id"
    :task="task"
    :dataset-builder="datasetBuilder"
    @next-step="nextStep"
    @prev-step="prevStep"
  />
</template>

<script lang="ts">
import TrainingFrame from '@/components/training/TrainingFrame.vue'
import { dataset, Task } from 'discojs'

export default {
  name: 'TrainingStep',
  components: {
    TrainingFrame
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
