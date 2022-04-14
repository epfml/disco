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
        <div v-if="!disco.isTraining">
          <custom-button
            :center="true"
            @click="startLocalTraining()"
          >
            {{
              $t('training.trainingFrame.localTrainingButton')
            }}
          </custom-button>
          <custom-button
            :center="true"
            @click="startDistributedTraining()"
          >
            {{
              $t('training.trainingFrame.collaborativeTrainingButton')
            }}
          </custom-button>
        </div>
        <div v-else>
          <custom-button
            :center="true"
            color="bg-red-500"
            @click="disco.stopTraining()"
          >
            {{
              $t('training.trainingFrame.stopTrainingButton')
            }}
          </custom-button>
        </div>
      </div>
      <!-- Training Board -->
      <div>
        <training-information-frame
          v-if="disco.trainingInformant"
          :training-informant="disco.trainingInformant"
        />
      </div>

      <!-- Save the model button -->
      <icon-card
        :header="$t('training.trainingFrame.saveModel.header')"
        :description="$t('training.trainingFrame.saveModel.description')"
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
              {{ $t('training.trainingFrame.saveModel.button') }}
            </custom-button>
          </div>
        </template>
      </icon-card>
      <!-- Test the model button -->
      <icon-card
        :header="$t('training.trainingFrame.testModel.header')"
        :description="$t('training.trainingFrame.testModel.description')"
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
              {{ $t('training.trainingFrame.testModel.button') }}
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
import { Disco } from '../../../core/training/disco'
import { DatasetBuilder } from '../../../core/dataset/dataset_builder'
import { DataLoader } from '../../../core/dataset/data_loader/data_loader'
import { Task } from '../../../core/task/task'

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
    task: {
      type: Task,
      default: undefined
    },
    dataLoader: {
      type: DataLoader,
      default: undefined
    }
  },
  computed: {
    ...mapState(['useIndexedDB'])
  },
  watch: {
    useIndexedDB (newValue) {
      this.disco.setIndexedDB(!!newValue)
    }
  },
  created () {
    this.disco = new Disco(
      this.task,
      this.$toast,
      this.useIndexedDB
    )
    this.datasetBuilder = new DatasetBuilder(this.dataLoader, this.task)
  },
  methods: {
    startLocalTraining () {
      this.startTraining(false)
    },
    startDistributedTraining () {
      this.startTraining(true)
    },
    async startTraining (distributedTraining) {
      try {
        if (!this.datasetBuilder.isBuilt()) {
          this.dataset = await this.datasetBuilder
            .build()
        }
        if (distributedTraining) {
          await this.disco.startTaskDefinedTraining(this.dataset)
        } else {
          await this.disco.startLocalTraining(this.dataset)
        }
      } catch {
        this.$toast.error('Invalid files were given!')
        setTimeout(this.$toast.clear, 30000)
      }
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
  }
}
</script>
