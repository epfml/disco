<template>
  <!-- Card to load a model-->
  <a
    v-if="workingModelExistsOnMount"
    id="load-model"
  >
    <IconCard>
      <template #title>Join training with a previous model</template>
      <template #icon><Clock /></template>
      <template #content>
        <!-- Restore Model -->
        <div v-if="useIndexedDB && workingModelExists && !isModelCreated">
          <div class="grid grid-cols-4 items-center justify-items-center">
            <div class="col-span-3">
              <div class="text-sm text-gray-500 dark:text-light">
                Disco has cached the last model you were working on for you. Select
                it to start training from it. Otherwise, it will be overridden
                the next time you train the
                {{ task.displayInformation.taskTitle }} task.<br/> This model was
                last updated the
                <span class="text-primary-dark dark:text-primary-light">
                  {{ dateSaved }}
                </span>
                at
                <span class="text-primary-dark dark:text-primary-light">
                  {{ hourSaved }}
                </span>
              </div>
            </div>
            <button
              class="relative focus:outline-none"
              @click="toggleUseWorkingModel()"
            >
              <div
                class="
                    w-12
                    h-6
                    transition
                    rounded-full
                    outline-none
                    bg-primary-100
                    dark:bg-primary-darker
                  "
              />
              <div
                class="
                    absolute
                    top-0
                    left-0
                    w-6
                    h-6
                    transition-all
                    duration-200
                    ease-in-out
                    transform
                    scale-110
                    rounded-full
                    shadow-sm
                  "
                :class="{
                  'translate-x-0 bg-white dark:bg-primary-100':
                    !useWorkingModel,
                  'translate-x-6 bg-primary-light dark:bg-primary':
                    useWorkingModel,
                }"
              />
            </button>
          </div>
          <div class="flex pt-4 space-x-4 justify-center">
            <button
              class="
                  flex
                  items-center
                  justify-center
                  px-4
                  py-2
                  space-x-4
                  transition-colors
                  border
                  rounded-md
                  hover:text-gray-900 hover:border-gray-900
                "
              :class="{
                'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100':
                  !isDark,
                'text-gray-500 dark:text-primary-light': isDark,
              }"
              @click="saveModel()"
            >
              <span>Save Model</span>
            </button>
            <button
              class="
                  flex
                  items-center
                  justify-center
                  px-4
                  py-2
                  space-x-4
                  transition-colors
                  border
                  rounded-md
                  hover:text-gray-900 hover:border-gray-900
                "
              :class="{
                'border-gray-900 text-gray-900':
                  !isDark,
                'text-gray-500': isDark,
              }"
              @click="deleteModel()"
            >
              <span>Delete Model</span>
            </button>
          </div>
          <div class="flex items-center justify-center pt-4">
            <CustomButton
              @click="proceed"
            >
              Continue training from this model
            </CustomButton>
          </div>
        </div>
        <div
          v-else
          class="text-sm text-gray-500"
        >
          <div v-if="useIndexedDB && isModelCreated">
            A new model has been created, replacing the previous working model.
          </div>
          <div v-else-if="!useIndexedDB && workingModelExists">
            FeAI cached the last model you were working on for you. Turn on
            the model library (see settings) to see additional options.
          </div>
          <div v-else>The previous working model has been deleted.</div>
        </div>
      </template>
    </IconCard>
  </a>
</template>

<script lang="ts">
import { mapState } from 'vuex'

import { EmptyMemory, Memory, ModelType, isTask, TrainingSchemes, ModelInfo } from 'discojs'

import { IndexedDB } from '@/memory'
import { getClient } from '@/clients'
import Clock from '@/assets/svg/Clock.vue'
import IconCard from '@/components/containers/IconCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

export default {
  name: 'ModelCaching',
  components: {
    IconCard,
    Clock,
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
    }
  },
  data () {
    return {
      isModelCreated: false,
      workingModelExists: false,
      workingModelExistsOnMount: false,
      useWorkingModel: false,
      dateSaved: '',
      hourSaved: ''
    }
  },
  computed: {
    ...mapState(['useIndexedDB', 'isDark']),
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
      return this.useIndexedDB ? new IndexedDB() : new EmptyMemory()
    },
    modelInfo (): ModelInfo {
      return {
        type: ModelType.WORKING, taskID: this.task.taskID, name: this.task.trainingInformation.modelID
      }
    }
  },
  watch: {
    /**
     * When useWorkingModel changed this function is called since it is "watched"
     */
    useWorkingModel (): void {
      let modelInUseMessage: string
      if (this.useWorkingModel) {
        modelInUseMessage = `The previous ${this.task.displayInformation.taskTitle} model has been selected. You can start training!`
      } else {
        modelInUseMessage = `A new ${this.task.displayInformation.taskTitle} model will be created. You can start training!`
      }
      this.$toast.success(modelInUseMessage)
      setTimeout(this.$toast.clear, 30000)
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
      if (this.useIndexedDB) {
        const workingModelMetadata = await this.memory.getModelMetadata(this.modelInfo)
        if (workingModelMetadata) {
          this.workingModelExistsOnMount = true
          this.workingModelExists = true
          const date = workingModelMetadata.dateSaved
          const zeroPad = (number: number) => String(number).padStart(2, '0')
          this.dateSaved = [
            date.getDate(),
            date.getMonth() + 1,
            date.getFullYear()
          ]
            .map(zeroPad)
            .join('/')
          this.hourSaved = [date.getHours(), date.getMinutes()]
            .map(zeroPad)
            .join('h')
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
      this.$toast.success(
        `Deleted the cached ${this.task.displayInformation.taskTitle} model.`
      )
      setTimeout(this.$toast.clear, 30000)
    },
    /**
     * Save the current working model to IndexedDB
     */
    async saveModel () {
      await this.memory.saveWorkingModel(this.modelInfo)
      this.$toast.success(
        `Saved the cached ${this.task.displayInformation.taskTitle} model to the model library`
      )
      setTimeout(this.$toast.clear, 30000)
    },
    /**
     * Toggle use working model
     */
    async toggleUseWorkingModel () {
      this.useWorkingModel = !this.useWorkingModel
    },
    /**
     * Create a new model and overwite the IndexedDB model with the new model
     */
    async loadFreshModel () {
      // TODO do not force scheme
      const client = getClient(TrainingSchemes.FEDERATED, this.task)

      this.memory.updateWorkingModel(this.modelInfo, await client.getLatestModel())
    },
    async proceed () {
      if (this.useIndexedDB && this.shouldCreateFreshModel) {
        await this.loadFreshModel()
        this.isModelCreated = true
        this.$toast.success(
          `A new ${this.task.displayInformation.taskTitle} model has been created. You can start training!`
        )
        setTimeout(this.$toast.clear, 30000)
      }
    }
  }
}
</script>
