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
      <DatasetInputStep
        v-show="step === 2"
        :id="id"
        :task="task"
        :dataset-builder="datasetBuilder"
        @next-step="nextStep"
        @prev-step="prevStep"
      />
      <TrainingStep
        v-show="step === 3"
        :id="id"
        :task="task"
        :dataset-builder="datasetBuilder"
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
import DatasetInputStep from './steps/DatasetInputStep.vue'
import BaseLayout from '@/components/containers/BaseLayout.vue'
import { WebImageLoader, WebTabularLoader } from '@/data_loader'

import { Task } from 'discojs'
import { DataLoader, DatasetBuilder } from 'discojs/dist/dataset'

export default {
  name: 'Navigation',
  components: {
    ProgressBar,
    DescriptionStep,
    DatasetInputStep,
    TrainingStep,
    BaseLayout
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
  data (): { step: number, progress: number } {
    return {
      step: 1,
      progress: 1
    }
  },
  created (): void {
    let dataLoader: DataLoader<File>
    switch (this.task.trainingInformation.dataType) {
      case 'tabular':
        dataLoader = new WebTabularLoader(this.task, ',')
        break
      case 'image':
        dataLoader = new WebImageLoader(this.task)
        break
      default:
        throw new Error('not implemented')
    }
    this.datasetBuilder = new DatasetBuilder(dataLoader, this.task)
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
