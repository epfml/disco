<template>
  <!-- Card to load a model-->
  <div v-if="memoryStore.useIndexedDB && workingModelExistsOnMount">
    <IconCard>
      <template #title>
        Using an Existing Cached Model
      </template>
      <template #icon>
        <Clock />
      </template>
      <template #content>
        <!-- Restore Model -->
        <div v-if="workingModelExists && !isModelCreated">
          <div class="text-sm text-gray-500 dark:text-light">
            Disco has cached the last model you trained, which was last updated the
            <span class="text-primary-dark dark:text-primary-light">
              {{ dateSaved }}
            </span>
            at
            <span class="text-primary-dark dark:text-primary-light">
              {{ hourSaved }}.
            </span><br>
            You can choose to continue training this model or the start from a new one. 
            Training with a new model will overwrite the cached so you may want to save it to the model library beforehand.
            
          </div>
          <!-- Buttons row container -->
          <div class="flex items-center justify-start pt-4 space-x-4">
            <CustomButton @click="saveModel()">
              <span>save to library</span>
            </CustomButton>
            <CustomButton @click="saveModel()">
              <span>delete cached model</span>
            </CustomButton>
          <!-- Toggle button enabling/disabling using the cached model -->
          <!-- <button
            class="relative focus:outline-none flex space-x-4 pt-4 items-center"
            @click="toggleUseWorkingModel()"
          >
            <span> Use the cached model </span>
            <div class="relative focus:outline-none">
              <div class=" w-12 h-6 transition rounded-full outline-none bg-slate-200"/>
              <div
                class="absolute top-0 left-0 inline-flex w-6 h-6
                  transition-all duration-200 ease-in-out transform
                  scale-110 rounded-full shadow-sm"
                :class="{'translate-x-0 bg-slate-300':!useWorkingModel,
                          'translate-x-6 bg-disco-blue':useWorkingModel}"
              />
            </div>
          </button> -->
          </div>
        </div>
        <div
          v-else
          class="text-sm text-gray-500"
        >
          <div v-if="memoryStore.useIndexedDB && isModelCreated">
            A new model has been created.
          </div>
          <div v-else>
            The cached model has been deleted.
          </div>
        </div>
      </template>
    </IconCard>
  </div>
</template>

<script lang="ts">
import { mapStores } from 'pinia'
import type { PropType } from 'vue'

import type { ModelInfo, Task } from '@epfml/discojs-core'
import { EmptyMemory, Memory, ModelType, isTask } from '@epfml/discojs-core'
import { IndexedDB } from '@epfml/discojs'

import { getClient } from '@/clients'
import { useToaster } from '@/composables/toaster'
import Clock from '@/assets/svg/Clock.vue'
import IconCard from '@/components/containers/IconCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import { useMemoryStore } from '@/store/memory'

const toaster = useToaster()

export default {
  name: 'ModelCaching',
  components: {
    IconCard,
    Clock,
    CustomButton
  },
  props: {
    task: {
      type: Object as PropType<Task>,
      validator: isTask,
      required: true
    }
  },
  data () {
    return {
      isModelCreated: false,
      workingModelExists: false,
      workingModelExistsOnMount: false,
      useWorkingModel: true,
      dateSaved: '',
      hourSaved: ''
    }
  },
  computed: {
    ...mapStores(useMemoryStore),
    /**
       * Returns true if a new model needs to be created
       */
    shouldCreateFreshModel (): boolean {
      return (
        !this.isModelCreated &&
          !(this.workingModelExists && this.useWorkingModel)
      )
    },
    memory (): Memory {
      return this.memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory()
    },
    modelInfo (): ModelInfo {
      return {
        type: ModelType.WORKING,
        taskID: this.task.id,
        name: this.task.trainingInformation.modelID
      }
    }
  },
  /**
   * This method is called when the component is created
   */
  async mounted (): Promise<void> {
    this.$nextTick(async function () {
      /**
       * If the IndexedDB is turned on and a working model exists in IndexedDB
       * on loading the description frame, then display the model restoration
       * feature.
       */
      if (this.memoryStore.useIndexedDB) {
        const workingModelMetadata = await this.memory.getModelMetadata(this.modelInfo)
        if (workingModelMetadata) {
          this.workingModelExistsOnMount = true
          this.workingModelExists = true
          const date = 'dateSaved' in workingModelMetadata ? workingModelMetadata.dateSaved : undefined
          if (date instanceof Date) {
            const zeroPad = (number: number) => String(number).padStart(2, '0')
            this.dateSaved = [date.getDate(), date.getMonth() + 1, date.getFullYear()]
              .map(zeroPad)
              .join('/')
            this.hourSaved = [date.getHours(), date.getMinutes()]
              .map(zeroPad)
              .join('h')
          }
        }
      }
    })
  },
  methods: {
    /**
     * Delete the model stored in IndexedDB corresponding to this task.
     */
    async deleteModel (): Promise<void> {
      this.workingModelExists = false
      await this.memory.deleteModel(this.modelInfo)
      toaster.success(`Deleted the cached model successfully.`)
    },
    /**
     * Save the current working model to IndexedDB
     */
    async saveModel () {
      await this.memory.saveWorkingModel(this.modelInfo)
      toaster.success(`Saved the cached model to the model library`)
    },
    /**
     * Toggle use working model
     */
    async toggleUseWorkingModel() {
      this.useWorkingModel = !this.useWorkingModel
      let modelInUseMessage: string
      if (this.useWorkingModel) {
        modelInUseMessage = "The cached model will be used during training."
      } else {
        modelInUseMessage = "A new model will be created and will overwrite the cached model."
      }
      toaster.info(modelInUseMessage)
    },
    /**
     * Create a new model and overwrite the IndexedDB model with the new model
     */
    async loadFreshModel () {
      // TODO do not force scheme
      const client = getClient('federated', this.task)

      this.memory.updateWorkingModel(this.modelInfo, await client.getLatestModel())
    },
    async proceed () {
      if (this.memoryStore.useIndexedDB && this.shouldCreateFreshModel) {
        await this.loadFreshModel()
        this.isModelCreated = true
        toaster.success(
          `A new ${this.task.displayInformation.taskTitle} model has been created. You can start training!`
        )
      }
    }
  }
}
</script>
