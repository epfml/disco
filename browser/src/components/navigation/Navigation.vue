<template>
  <BaseLayout>
    <div>
      <div class="grid grid-cols-2 gap-8 py-6 items-center">
        <div
          class="text-right"
        >
          <CustomButton
            @click="prevStep"
          >
            Previous
          </CustomButton>
        </div>
        <div
          class="text-left"
        >
          <CustomButton
            v-if="step <= 3"
            @click="nextStep"
          >
            Next
          </CustomButton>
        </div>
      </div>
      <Description
        v-show="step === 1"
        :task="task"
      />
      <DatasetInput
        v-show="step === 2"
        :task="task"
        :dataset-builder="datasetBuilder"
        @add-files="addFiles"
        @clear-files="clearFiles"
      />
      <Training
        v-show="step === 3"
        :task="task"
        :dataset-builder="datasetBuilder"
      />
      <Finished
        v-show="step === 4"
        :task="task"
      />
    </div>
  </BaseLayout>
</template>

<script lang="ts">
import CustomButton from '@/components/simple/CustomButton.vue'
import Description from '@/components/Description.vue'
import Training from '@/components/training/Training.vue'
import Finished from '@/components/Finished.vue'
import DatasetInput from '@/components/dataset_input/DatasetInput.vue'
import BaseLayout from '@/components/containers/BaseLayout.vue'
import { WebImageLoader, WebTabularLoader } from '@/data_loader'

import { isTask } from 'discojs'
import { DataLoader, DatasetBuilder } from 'discojs/dist/dataset'

export default {
  name: 'Navigation',
  components: {
    Description,
    DatasetInput,
    Training,
    Finished,
    BaseLayout,
    CustomButton
  },
  props: {
    id: {
      type: String,
      default: ''
    },
    task: {
      validator: isTask,
      default: undefined
    },
    step: {
      type: Number,
      default: undefined
    }
  },
  emits: ['next-step', 'prev-step'],
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
    addFiles (files: FileList, label?: string) {
      this.datasetBuilder.addFiles(Array.from(files), label)
    },
    clearFiles (label?: string) {
      this.datasetBuilder.clearFiles(label)
    },
    nextStep () {
      this.$emit('next-step')
    },
    prevStep () {
      if (this.step <= 1) {
        this.$router.push({ path: '/list' })
      }
      this.$emit('prev-step')
    }
  }
}
</script>
