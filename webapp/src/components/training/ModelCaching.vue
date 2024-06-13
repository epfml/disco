<!-- 
  This component is only displayed if the model library is enabled and a cached model exists.
  It informs users that the cached model will be used by default during the next training, and let
  them choose whether they would like to delete it and start with a new model and if they want to 
  save the cached model to library.
 -->
<template>
  <!-- Card to load a model-->
  <div v-if="memoryStore.useIndexedDB && cachedModelExistsOnMount">
    <IconCard>
      <template #title>
        Re-using a Cached Model
      </template>
      <template #icon>
        <Clock />
      </template>
      <template #content>
        <!-- Restore Model -->
        <div v-if="cachedModelExists && !isNewModelCreated">
          <div class="text-sm text-gray-500 dark:text-light">
            Disco has cached and will re-use the last model you trained, which was last updated the
            <span class="text-primary-dark dark:text-primary-light">
              {{ dateSaved }}
            </span>
            at
            <span class="text-primary-dark dark:text-primary-light">
              {{ hourSaved }}.
            </span><br>
            By default this model will be reused when training but you can choose to delete it and start with an untrained one.
            You may want to save the cached model to the model library beforehand.
            
          </div>
          <!-- Buttons row container -->
          <div class="flex items-center justify-start pt-4 space-x-4">
            <CustomButton @click="saveModel()">
              <span>save to library</span>
            </CustomButton>
            <CustomButton @click="deleteModel()">
              <span>delete cached model</span>
            </CustomButton>
          </div>
        </div>
        <div
          v-else
          class="text-sm text-gray-500"
        >
          <div v-if="memoryStore.useIndexedDB && isNewModelCreated">
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

import type { ModelInfo, Task } from '@epfml/discojs'
import { EmptyMemory, Memory, isTask } from '@epfml/discojs'
import { IndexedDB } from '@epfml/discojs-web'

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
      isNewModelCreated: false,
      // whether a cached model exists when mounting the page
      cachedModelExistsOnMount: false,
      // whether the cached model exists (could be deleted now)
      cachedModelExists: false,
      dateSaved: '',
      hourSaved: ''
    }
  },
  computed: {
    ...mapStores(useMemoryStore),
    memory (): Memory {
      return this.memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory()
    },
    modelInfo (): ModelInfo {
      return {
        type: 'working',
        taskID: this.task.id,
        name: this.task.trainingInformation.modelID,
        tensorBackend: this.task.trainingInformation.tensorBackend,
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
          this.cachedModelExistsOnMount = true
          this.cachedModelExists = true
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
      this.cachedModelExists = false
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
  }
}
</script>
