<template>
  <div>
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
    <div v-show="validationStore.step === 0">
      <div
        v-if="memoryStore.models.size > 0"
        class="grid gris-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch gap-8 mt-8"
      >
        <div
          v-for="[path, metadata] in memoryStore.models"
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
      <div v-show="validationStore.step === 1">
        <!-- Information specific to the validation panel -->
        <IconCard class="mb-3">
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
        v-show="validationStore.step === 2"
        :task="task"
        :dataset-builder="datasetBuilder"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { RouterLink } from 'vue-router'
import { mapStores } from 'pinia'

import { browser, EmptyMemory, Memory, Path, Task, data } from '@epfml/discojs'

import { useMemoryStore } from '@/store/memory'
import { useTasksStore } from '@/store/tasks'
import { useValidationStore } from '@/store/validation'
import CustomButton from '@/components/simple/CustomButton.vue'
import Data from '@/components/data/Data.vue'
import Validator from '@/components/validation/Validator.vue'
import ButtonCard from '@/components/containers/ButtonCard.vue'
import IconCard from '@/components/containers/IconCard.vue'

export default defineComponent({
  name: 'Testing',
  components: {
    Validator,
    Data,
    ButtonCard,
    IconCard,
    RouterLink,
    CustomButton
  },
  data (): { task: Task } {
    return {
      task: undefined
    }
  },
  computed: {
    ...mapStores(useMemoryStore, useTasksStore, useValidationStore),
    showPrev (): boolean {
      return this.validationStore.step > 0
    },
    showNext (): boolean {
      return this.validationStore.step > 0 && this.validationStore.step < 2
    },
    memory (): Memory {
      return this.memoryStore.useIndexedDB ? new browser.IndexedDB() : new EmptyMemory()
    },
    validationState (): boolean {
      return this.validationStore.state
    },
    datasetBuilder (): data.DatasetBuilder<File> | undefined {
      if (this.task === undefined) {
        return undefined
      }
      let dataLoader: data.DataLoader<File>
      switch (this.task.trainingInformation.dataType) {
        case 'tabular':
          dataLoader = new browser.data.WebTabularLoader(this.task, ',')
          break
        case 'image':
          dataLoader = new browser.data.WebImageLoader(this.task)
          break
        default:
          throw new Error('not implemented')
      }
      return new data.DatasetBuilder(dataLoader, this.task)
    }
  },
  watch: {
    async validationState (_: boolean) {
      if (this.validationStore.model !== undefined) {
        await this.selectModel(this.validationStore.model)
      }
    }
  },
  async mounted (): Promise<void> {
    await this.memoryStore.initModels()
    // can't watch before mount
    if (this.validationStore.model !== undefined) {
      this.selectModel(this.validationStore.model)
    }
  },
  async activated (): Promise<void> {
    await this.memoryStore.initModels()
  },
  methods: {
    async selectModel (path: Path): Promise<void> {
      const task = this.tasksStore.tasks.get(this.memory.infoFor(path)?.taskID)
      if (task !== undefined) {
        this.task = task
        this.validationStore.model = path
        this.validationStore.step = 1
      } else {
        this.$toast.error('Model not found')
      }
    },
    prevStep (): void {
      this.validationStore.step--
    },
    nextStep (): void {
      this.validationStore.step++
    },
    taskTitle (taskID: string): string {
      const task = this.tasksStore.tasks.get(taskID)
      if (task !== undefined) {
        return task.displayInformation.taskTitle
      } else {
        this.$toast.error('Task not found')
      }
    }
  }
})
</script>
