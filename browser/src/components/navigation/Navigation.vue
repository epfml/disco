/* eslint-disable no-unused-vars */
<template>
  <BaseLayout>
    <div>
      <ProgressBar :step="progress" />
      <DescriptionStep
        v-show="step === 1"
        :id="id"
        :task="task"
        @next-step="nextStep"
        @prev-step="prevStep"
      />
      <TrainingStep
        v-show="step === 2"
        :id="id"
        :task="task"
        @next-step="nextStep"
        @prev-step="prevStep"
      />
    </div>
  </BaseLayout>
</template>

<script lang="ts">
import ProgressBar from './ProgressBar.vue'
import DescriptionStep from './steps/DescriptionStep.vue'
import TrainingStep from './steps/TrainingStep.vue'
import BaseLayout from '../containers/BaseLayout.vue'

export default {
  name: 'Navigation',
  components: {
    ProgressBar,
    DescriptionStep,
    TrainingStep,
    BaseLayout
  },
  props: {
    id: {
      type: String,
      default: ''
    },
    task: {
      type: Object,
      default: undefined
    }
  },
  data (): { step: number, progress: number } {
    return {
      step: 1,
      progress: 1
    }
  },
  activated () {
    this.step = this.progress
  },
  methods: {
    nextStep () {
      this.step = Math.min(3, this.step + 1)
      this.progress = Math.max(this.progress, this.step)
    },
    prevStep () {
      this.step = Math.max(1, this.step - 1)
    }
  }
}
</script>
