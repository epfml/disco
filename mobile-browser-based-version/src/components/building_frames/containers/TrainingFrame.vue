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
            @click="training_manager.joinTraining(false)"
          >
            Train Locally
          </custom-button>
          <custom-button
            :center="true"
            @click="training_manager.joinTraining(true)"
          >
            Train {{ $t('platform') }}
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
    id: String,
    task: Object,
    helper: Object
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
  data () {
    return {
      training_manager: new TrainingManager(
        this.task,
        this.$store.getters.platform,
        this.$toast,
        this.helper,
        this.useIndexedDB
      )
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
