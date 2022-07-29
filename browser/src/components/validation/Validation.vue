<template>
  <div>
    <!-- navigation bar -->
    <ValidationBar :step="step" />
    <!-- previous button -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 py-6">
      <div
        class="text-center md:text-right"
      >
        <CustomButton
          v-show="showPrev"
          @click="prevStep"
        >
          Previous
        </CustomButton>
      </div>
      <div
        class="text-center md:text-left"
      >
        <CustomButton
          v-show="showNext"
          @click="nextStep"
        >
          Next
        </CustomButton>
      </div>
    </div>
    <div v-show="step === 0">
      <div
        v-if="models.size > 0"
        class="grid gris-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-8 mt-8"
      >
        <div
          v-for="[path, metadata] in models"
          :key="path"
          class="contents"
        >
          <ButtonCard
            :click="() => selectModel(path)"
            :button-placement="'left'"
          >
            <template #title>
              {{ taskTitle(metadata.taskID) }}
            </template>
            <template #text>
              <div class="grid grid-cols-2 justify-items-between">
                <p class="contents">
                  <span>Model:</span>
                  <span>{{ metadata.name.substring(0, 20) }}</span>
                </p>
                <p class="contents">
                  <span>Date:</span>
                  <span>{{ metadata.date }} at {{ metadata.hours }}</span>
                </p>
                <p class="contents">
                  <span>Size:</span><span>{{ metadata.fileSize }} kB</span>
                </p>
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
      <!-- 1. CONNECT YOUR DATA -->
      <div v-show="step === 1">
        <!-- Information specific to the validation panel -->
        <IconCard>
          <template #title>
            Model Validation
          </template>
          <template #content>
            It is very important that your model is tested against <b class="uppercase">unseen data</b>.
            As such, please ensure your dataset of choice was not used during the training phase of your model.
          </template>
        </IconCard>
        <!-- Generic dataset information and input -->
        <Data
          :task="task"
          :dataset-builder="datasetBuilder"
        />
      </div>
      <!-- 2. TEST YOUR MODEL -->
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
import { defineComponent } from 'vue'
import { RouterLink } from 'vue-router'
import { mapState } from 'vuex'

import { EmptyMemory, Memory, Path, Task, dataset } from 'discojs'

import { IndexedDB } from '@/memory'
import { toaster } from '@/toast'
import { WebTabularLoader, WebImageLoader } from '@/data_loader'
import CustomButton from '@/components/simple/CustomButton.vue'
import ValidationBar from '@/components/validation/ValidationBar.vue'
import Data from '@/components/data/Data.vue'
import Validator from '@/components/validation/Validator.vue'
import ButtonCard from '@/components/containers/ButtonCard.vue'
import IconCard from '@/components/containers/IconCard.vue'

export default defineComponent({
  name: 'Testing',
  components: {
    ValidationBar,
    Validator,
    Data,
    ButtonCard,
    IconCard,
    RouterLink,
    CustomButton
  },
  data (): { task: Task, step: number, model: Path } {
    return {
      task: undefined,
      step: 0,
      model: ''
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
    datasetBuilder (): dataset.DatasetBuilder<File> | undefined {
      if (this.task === undefined) {
        return undefined
      }
      let dataLoader: dataset.DataLoader<File>
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
      return new dataset.DatasetBuilder(dataLoader, this.task)
    }
  },
  watch: {
    async testingState (_: boolean) {
      if (this.testingModel !== undefined) {
        await this.selectModel(this.testingModel)
      }
    }
  },
  async mounted (): Promise<void> {
    await this.$store.dispatch('initModels')
    // can't watch before mount
    if (this.testingModel !== undefined) {
      this.selectModel(this.testingModel)
    }
  },
  async activated (): Promise<void> {
    await this.$store.dispatch('initModels')
  },
  methods: {
    async selectModel (path: Path): Promise<void> {
      const task = this.tasks.get(this.memory.infoFor(path)?.taskID)
      if (task !== undefined) {
        this.task = task
        this.model = path
        this.step = 1
      } else {
        toaster.error('Model not found')
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
        toaster.error('Task not found')
      }
    }
  }
})
</script>
