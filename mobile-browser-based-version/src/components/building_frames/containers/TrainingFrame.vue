<template>
  <model-actor-frame :task="task">
    <template v-slot:dataExample><slot name="dataExample"></slot></template>
    <template v-slot:action>
      <!-- Upload Training Data -->
      <div class="relative">
        <dataset-input-frame
          :id="id"
          :task="task"
          :datasetBuilder="datasetBuilder"
        />
      </div>

      <slot name="extra"></slot>

      <!-- Train Button -->
      <div class="flex items-center justify-center p-4">
        <div v-if="!trainingManager.isTraining">
          <custom-button @click="startTraining(false)" :center="true">
            Train Locally
          </custom-button>
          <custom-button @click="startTraining(true)" :center="true">
            Train {{ this.$t('platform') }}
          </custom-button>
        </div>
        <div v-else>
          <custom-button
            @click="trainingManager.stopTraining()"
            :center="true"
            color="bg-red-500"
          >
            Stop <span v-if="distributedTraining">Distributed</span><span v-else>Local</span> Training
          </custom-button>
        </div>
      </div>
      <!-- Training Board -->
      <div>
        <training-information-frame
          :trainingInformant="trainingManager.trainingInformant"
          v-if="trainingManager.trainingInformant"
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
        <template v-slot:icon><download /></template>
        <template v-slot:extra
          ><div class="flex items-center justify-center p-4">
            <!-- make it gray & un-clickable if indexeddb is turned off -->
            <custom-button
              id="train-model-button"
              @click="saveModel()"
              :center="true"
            >
              Save My model
            </custom-button>
          </div></template
        >
      </icon-card>
      <!-- Test the model button -->
      <icon-card
        header="Test the model"
        description="Once you have finished training your model it might be a great idea
            to go test it."
      >
        <template v-slot:icon><download /></template>
        <template v-slot:extra>
          <!-- Description -->
          <div class="relative p-4 overflow-x-hidden">
            <span
              style="white-space: pre-line"
              class="text-sm text-gray-500 dark:text-light"
            >
            </span>
          </div>
          <div class="flex items-center justify-center p-4">
            <custom-button
              id="train-model-button"
              @click="goToTesting()"
              :center="true"
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
import * as memory from '../../../core/memory/memory'
import { TrainingManager } from '../../../core/training/training_manager'
import { DatasetBuilder } from '../../../core/dataset/dataset_builder'
import { Task } from '../../../core/task/task'

export default {
  name: 'training-frame',
  props: {
    id: String,
    task: Task,
    datasetBuilder: DatasetBuilder
  },
  components: {
    DatasetInputFrame,
    TrainingInformationFrame,
    ModelActorFrame,
    IconCard,
    CustomButton,
    Download
  },
  computed: {
    ...mapState(['useIndexedDB'])
  },
  watch: {
    useIndexedDB (newValue) {
      this.trainingManager.trainer.setIndexedDB(!!newValue)
    }
  },
  methods: {
    startTraining (distributedTraining) {
      if (!this.datasetBuilder.isBuilt()) {
        this.dataset = this.datasetBuilder.build()
      }
      this.trainingManager.startTraining(this.dataset, distributedTraining)
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
      this.$router.push({
        path: 'testing'
      })
    }
  },
  created () {
    this.trainingManager = new TrainingManager(
      this.task,
      this.$store.getters.platform,
      this.$toast,
      this.useIndexedDB
    )
  }
}
</script>
