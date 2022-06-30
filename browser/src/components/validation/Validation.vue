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
      <ValidationBar
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
    <div v-show="step === 0">
      <div
        v-if="models.size > 0"
        class="grid grid-cols-3 items-stretch gap-8 mt-8"
      >
        <div
          v-for="[path, metadata] in models"
          :key="path"
          class="contents"
        >
          <ButtonCard
            :click="() => selectModel(metadata)"
            :button-placement="'left'"
          >
            <template #title>
              {{ taskTitle(metadata.taskID) }}
            </template>
            <template #text>
              <div class="grid grid-cols-4">
                <div>
                  <p>Model:</p>
                  <p>Date:</p>
                  <p>Size:</p>
                </div>
                <div />
                <div class="col-span-2">
                  <p>{{ metadata.name.substring(0, 20) }}</p>
                  <p>{{ metadata.date }} at {{ metadata.hours }}</p>
                  <p>{{ metadata.fileSize }} kB</p>
                </div>
              </div>
            </template>
            <template #button>
              Test model
            </template>
          </ButtonCard>
        </div>
      </div>
      <div v-else>
        <IconCard>
          <template #title>
            No registered model
          </template>
          <template #content>
            Please go to the <RouterLink
              class="underline font-bold"
              to="/list"
            >
              training page.
            </RouterLink>
          </template>
        </IconCard>
      </div>
    </div>
    <div v-if="task !== undefined">
      <DatasetInput
        v-show="step === 1"
        :task="task"
        :dataset-builder="datasetBuilder"
      />
      <Validator
        v-show="step === 2"
        :task="task"
        :dataset-builder="datasetBuilder"
        :model="model"
      />
    </div>
  </div>
</template>
<script lang="ts">
import ValidationBar from '@/components/validation/ValidationBar.vue'
import DatasetInput from '@/components/dataset_input/DatasetInput.vue'
import Validator from '@/components/validation/Validator.vue'
import ButtonCard from '@/components/containers/ButtonCard.vue'
import IconCard from '@/components/containers/IconCard.vue'
import { IndexedDB, pathFor } from '@/memory'
import { WebTabularLoader, WebImageLoader } from '@/data_loader'

import { EmptyMemory, Memory, Task } from 'discojs'
import { DatasetBuilder, DataLoader } from 'discojs/dist/dataset'

import { mapState } from 'vuex'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Testing',
  components: {
    ValidationBar,
    Validator,
    DatasetInput,
    ButtonCard,
    IconCard
  },
  data (): { task: Task, step: number, model: string } {
    return {
      task: undefined,
      step: 0,
      model: undefined
    }
  },
  computed: {
    ...mapState(['useIndexedDB', 'models', 'tasks', 'testingModel', 'testingState']),
    showPrev (): boolean {
      return this.step > 0
    },
    showNext (): boolean {
      return this.step > 0 && this.step < 2
    },
    memory (): Memory {
      return this.useIndexedDB ? new IndexedDB() : new EmptyMemory()
    },
    datasetBuilder (): DatasetBuilder<File> | undefined {
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
  watch: {
    testingState (_: boolean) {
      this.selectModel(this.models.get(this.testingModel))
    }
  },
  async mounted (): Promise<void> {
    await this.$store.dispatch('initModels')
    // can't watch before mount
    if (this.testingModel !== undefined) {
      this.selectModel(this.models.get(this.testingModel))
    }
  },
  async activated (): Promise<void> {
    await this.$store.dispatch('initModels')
  },
  methods: {
    async selectModel (metadata: any): Promise<void> {
      if (metadata !== undefined) {
        const task = this.tasks.get(metadata.taskID)
        if (task !== undefined) {
          this.task = task
          this.model = pathFor(metadata.modelType, metadata.taskID, metadata.name)
          this.step = 1
        } else {
          throw new Error('model\'s task does not exist locally')
        }
      }
    },
    prevStep (): void {
      this.step -= 1
    },
    nextStep (): void {
      this.step += 1
    },
    taskTitle (taskID: string): string {
      const task = this.tasks.get(taskID)
      if (task !== undefined) {
        return task.displayInformation.taskTitle
      } else {
        throw new Error('model\'s task does exist locally')
      }
    }
  }
})
</script>
