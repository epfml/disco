<template>
  <div>
    <div class="flex py-6">
      <div class="text-right w-1/5">
        <button
          v-show="showPrev"
          class="
            h-10 w-10
            text-lg font-bold text-white hover:text-disco-blue
            bg-disco-blue hover:bg-white
            rounded-full
            duration-200
            hover:outline hover:outline-2 hover:outline-disco-blue
          "
          @click="prevStep()"
        >
          &lt;
        </button>
      </div>
      <TestingBar
        :step="step"
        class="w-3/5"
      />
      <div class="text-left w-1/5">
        <button
          v-show="showNext"
          class="
            h-10 w-10
            text-lg font-bold text-white hover:text-disco-blue
            bg-disco-blue hover:bg-white
            rounded-full
            duration-200
            hover:outline hover:outline-2 hover:outline-disco-blue
          "
          @click="nextStep()"
        >
          &gt;
        </button>
      </div>
    </div>
    <div
      v-show="step === 0"
    >
      <div class="grid grid-flow-col auto-cols-auto gap-8 mt-8">
        <div
          v-for="[path, metadata] in models"
          :key="path"
        >
          <ButtonCard
            :click="() => selectModel(path, metadata)"
            :button-placement="'left'"
          >
            <template #title>
              {{ taskTitle(metadata.taskID) }}
            </template>
            <template #text>
              <p>Model: {{ metadata.name }}</p>
              <p>Date: {{ metadata.date }} at {{ metadata.hours }}</p>
              <p>Size: {{ metadata.fileSize }} kB</p>
            </template>
            <template #button>
              Test
            </template>
          </ButtonCard>
        </div>
      </div>
    </div>
    <DatasetInput
      v-if="step === 1"
      :task="task"
      :dataset-builder="datasetBuilder"
    />
  </div>
</template>
<script lang="ts">
import TestingBar from '@/components/testing/TestingBar.vue'
import DatasetInput from '@/components/dataset_input/DatasetInput.vue'
import ButtonCard from '@/components/containers/ButtonCard.vue'
import { IndexedDB } from '@/memory'
import { WebTabularLoader, WebImageLoader } from '@/data_loader'

import { Memory, Task } from 'discojs'
import { DatasetBuilder, DataLoader } from 'discojs/dist/dataset'
import { mapState } from 'vuex'

export default {
  name: 'NewTesting',
  components: {
    TestingBar,
    DatasetInput,
    ButtonCard
  },
  data (): { task: Task, memory: Memory, step: number } {
    return {
      task: undefined,
      memory: new IndexedDB(),
      step: 0
    }
  },
  computed: {
    ...mapState(['models', 'tasks']),
    showPrev (): boolean {
      return this.step > 0
    },
    showNext (): boolean {
      return this.step > 0 && this.step < 2
    },
    datasetBuilder (): DatasetBuilder<File> {
      if (this.task === undefined) {
        return undefined
      }
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
  async mounted () {
    await this.$store.dispatch('initModels')
  },
  methods: {
    selectModel (path: string, metadata: any): void {
      const task = this.tasks.get(metadata.taskID)
      if (task !== undefined) {
        this.task = task
      } else {
        throw new Error('model\'s task does not exist locally')
      }
      this.step += 1
    },
    prevStep () {
      this.step -= 1
    },
    nextStep () {
      this.step += 1
    },
    taskTitle (taskID: string) {
      const task = this.tasks.get(taskID)
      if (task !== undefined) {
        return task.displayInformation.taskTitle
      } else {
        throw new Error('model\'s task does exist locally')
      }
    }
  }
}
</script>
