<template>
  <model-actor-frame :task="task">
    <template #dataExample>
      <slot name="dataExample" />
    </template>
    <template #action>
      <!-- Upload Training Data -->
      <div class="relative">
        <dataset-input-frame
          :id="id"
          :task="task"
          :dataset-builder="datasetBuilder"
        />
      </div>

      <slot name="extra" />

      <!-- Train Button -->
      <div class="flex items-center justify-center p-4">
        <div v-if="!isTraining">
          <custom-button
            :center="true"
            @click="startTraining(false)"
          >
            Train Locally
          </custom-button>
          <custom-button
            :center="true"
            @click="startTraining(true)"
          >
            Train {{ $t('platform') }}
          </custom-button>
        </div>
        <div v-else>
          <custom-button
            :center="true"
            color="bg-red-500"
            @click="stopTraining()"
          >
            Stop <span v-if="distributedTraining">Distributed</span><span v-else>Local</span> Training
          </custom-button>
        </div>
      </div>
      <!-- Training Board -->
      <div>
        <training-information-frame
          v-if="trainingInformant"
          :training-informant="trainingInformant"
        />
      </div>

      <!-- Save the model button -->
      <icon-card
        header="Save the model"
        description="If you are satisfied with the performance of the model, don't
            forget to save the model by clicking on the button below. The next
            time you will load the application, you will be able to use your
            saved model."
      >
        <template #icon>
          <download />
        </template>
        <template #extra>
          <div class="flex items-center justify-center p-4">
            <!-- make it gray & un-clickable if indexeddb is turned off -->
            <custom-button
              id="train-model-button"
              :center="true"
              @click="saveModel()"
            >
              Save My model
            </custom-button>
          </div>
        </template>
      </icon-card>
      <!-- Test the model button -->
      <icon-card
        header="Test the model"
        description="Once you have finished training your model it might be a great idea
            to go test it."
      >
        <template #icon>
          <download />
        </template>
        <template #extra>
          <!-- Description -->
          <div class="relative p-4 overflow-x-hidden">
            <span
              style="white-space: pre-line"
              class="text-sm text-gray-500 dark:text-light"
            />
          </div>
          <div class="flex items-center justify-center p-4">
            <custom-button
              id="train-model-button"
              :center="true"
              @click="goToTesting()"
            >
              Test the model
            </custom-button>
          </div>
        </template>
      </icon-card>
    </template>
  </model-actor-frame>
</template>

<script>
import DatasetInputFrame from '../dataset_input/DatasetInputFrame.vue'
import TrainingInformationFrame from '../TrainingInformationFrame.vue'
import ModelActorFrame from './ModelActorFrame.vue'
import IconCard from '../../containers/IconCard.vue'
import CustomButton from '../../simple/CustomButton.vue'
import Download from '../../../assets/svg/Download.vue'

import { mapState } from 'vuex'
import { Disco } from '../../../training/disco'
import * as memory from '../../../memory'
import { dataset, Task } from 'discojs'

export default {
  name: 'TrainingFrame',
  components: {
    DatasetInputFrame,
    TrainingInformationFrame,
    ModelActorFrame,
    IconCard,
    CustomButton,
    Download
  },
  props: {
    id: {
      type: String,
      default: ''
    },
    task: Task,
    dataLoader: dataset.DataLoader
  },
  data () {
    return {
      isTraining: false,
      distributedTraining: undefined,
      trainingInformant: undefined
    }
  },
  computed: {
    disco () {
      return new Disco(
        this.task,
        this.$store.getters.platform,
        this.$toast,
        this.useIndexedDB
      )
    },
    datasetBuilder () {
      return new dataset.DatasetBuilder(this.dataLoader, this.task)
    },
    ...mapState(['useIndexedDB'])
  },
  watch: {
    useIndexedDB (newValue) {
      this.disco.setIndexedDB(!!newValue)
    }
  },

  mounted () {
    // transform trainingInformant into a JS proxy
    this.trainingInformant = this.disco.trainingInformant
    this.disco.trainingInformant = this.trainingInformant
  },

  methods: {
    async startTraining (distributedTraining) {
      this.distributedTraining = distributedTraining

      try {
        if (!this.datasetBuilder.isBuilt()) {
          this.dataset = await this.datasetBuilder
            .build()
        }
        await this.disco.startTraining(this.dataset, distributedTraining)
        this.isTraining = true
      } catch (e) {
        const msg = e instanceof Error ? e.message : e.toString()
        this.$toast.error(msg)
        setTimeout(this.$toast.clear, 30000)
      }
    },
    async stopTraining () {
      await this.disco.stopTraining()
      this.isTraining = false
    },
    async saveModel () {
      if (this.useIndexedDB) {
        await memory.saveWorkingModel(
          this.task.taskID,
          this.task.trainingInformation.modelID
        )
        this.$toast.success(
          `The current ${this.task.displayInformation.taskTitle} model has been saved.`
        )
      } else {
        this.$toast.error(
          'The model library is currently turned off. See settings for more information'
        )
      }
      setTimeout(this.$toast.clear, 30000)
    },
    goToTesting () {
      this.$router.push({ path: 'testing' })
    }
  }
}
</script>
