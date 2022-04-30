<template>
  <BaseLayout>
    <div>
      <ProgressBar :progress="step" />
      <Step
        v-show="step === 1"
        :born-ready="true"
        @next-step="nextStep"
        @prev-step="prevStep"
      >
        <Description
          :id="id"
          :task="task"
        />
      </Step>
      <Step
        v-show="step === 2"
        @next-step="nextStep"
        @prev-step="prevStep"
      >
        <DatasetInput
          :id="id"
          :task="task"
          :dataset-builder="datasetBuilder"
        />
      </Step>
      <Step
        v-show="step === 3"
        @next-step="nextStep"
        @prev-step="prevStep"
      >
        <Training
          :id="id"
          :task="task"
          :dataset-builder="datasetBuilder"
        />
      </Step>
    </div>
  </BaseLayout>
</template>

<script lang="ts">
import ProgressBar from './ProgressBar.vue'
import Step from './Step.vue'
import Description from '@/components/Description.vue'
import Training from '@/components/training/Training.vue'
import DatasetInput from '@/components/dataset_input/DatasetInput.vue'
import BaseLayout from '@/components/containers/BaseLayout.vue'
import { WebImageLoader, WebTabularLoader } from '@/data_loader'

import { Task } from 'discojs'
import { DataLoader, DatasetBuilder } from 'discojs/dist/dataset'

export default {
  name: 'Navigation',
  components: {
    ProgressBar,
    Description,
    DatasetInput,
    Training,
    Step,
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
  data (): { step: number } {
    return {
      step: 1
    }
  },
  computed: {
    datasetBuilder (): DatasetBuilder<File> {
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
      return new DatasetBuilder(dataLoader, this.task)
    }
  },
  methods: {
    nextStep () {
      this.step = Math.min(3, this.step + 1)
    },
    prevStep () {
      if (this.step <= 1) {
        this.$router.push({ path: '/list' })
      } else {
        this.step -= 1
      }
    }
  }
}
</script>
