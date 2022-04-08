<template>
  <model-actor-frame :task="task">
    <template #dataExample>
      <slot name="dataExample" />
    </template>
    <template #action>
      <!-- Upload Training Data -->
      <div class="relative">
        <dataset-input-frame
          v-if="training_manager.fileUploadManager"
          :id="id"
          :task="task"
          :file-upload-manager="training_manager.fileUploadManager"
        />
      </div>

      <slot name="extra" />

      <!-- Train Button -->
      <div class="flex items-center justify-center p-4">
        <div v-if="!training_manager.isTraining">
          <custom-button
            :center="true"
            @click="training_manager.joinLocalTraining()"
          >
            {{
              $t('training.trainingFrame.localTrainingButton')
            }}
          </custom-button>
          <custom-button
            :center="true"
            @click="training_manager.joinTaskDefinedTraining()"
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
            @click="training_manager.stopTraining()"
          >
            Stop {{ trainingText }} Training
          </custom-button>
        </div>
      </div>
      <!-- Training Board -->
      <div>
        <training-information-frame
          v-if="training_manager.trainingInformant"
          :training-informant="training_manager.trainingInformant"
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
import DatasetInputFrame from '../upload/DatasetInputFrame.vue'
import TrainingInformationFrame from '../TrainingInformationFrame.vue'
import ModelActorFrame from './ModelActorFrame.vue'
import IconCard from '../../containers/IconCard.vue'
import CustomButton from '../../simple/CustomButton.vue'
import Download from '../../../assets/svg/Download.vue'

import { mapState } from 'vuex'
import * as memory from '../../../core/memory/memory'
import { TrainingManager } from '../../../core/training/training_manager'

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
      type: Object,
      default: undefined
    },
    helper: {
      type: Object,
      default: undefined
    }
  },
  data () {
    return {
      training_manager: new TrainingManager(
        this.task,
        this.$toast,
        this.helper,
        this.useIndexedDB
      )
    }
  },
  computed: {
    ...mapState(['useIndexedDB']),
    trainingText () {
      return this.training_manager.distributedTraining ? 'Distributed' : 'Local'
    }
  },
  watch: {
    // TODO: @s314cy, what does this do?
    useIndexedDB (newValue) {
      this.training_manager.trainer().setIndexedDB(!!newValue)
    }
  },
  created () {
    // Disconnect from the centralized server on page close
    window.addEventListener('beforeunload', () => {
      this.training_manager.client.disconnect()
    })
  },
  unmounted () {
    this.training_manager.disconnect()
  },
  methods: {
    goToTesting () {
      this.$router.push({
        path: 'testing'
      })
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
    }
  }
}
</script>
