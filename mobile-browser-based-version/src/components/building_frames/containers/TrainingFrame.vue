<template>
  <model-actor-frame :task="task">
    <template v-slot:dataExample><slot name="dataExample"></slot></template>
    <template v-slot:action>
      <!-- Upload Training Data -->
      <div class="relative">
        <uploading-frame
          :id="id"
          :task="task"
          :fileUploadManager="trainer.fileUploadManager"
          v-if="trainer.fileUploadManager"
        />
      </div>

      <slot name="extra"></slot>

      <!-- Train Button -->
      <div class="flex items-center justify-center p-4">
        <div v-if="!trainer.isTraining">
          <custom-button @click="trainer.joinTraining(false)" :center="true">
            Train Locally
          </custom-button>
          <custom-button @click="trainer.joinTraining(true)" :center="true">
            Train {{ this.$t('platform') }}
          </custom-button>
        </div>
        <div v-else>
          <custom-button
            @click="trainer.stopTraining()"
            :center="true"
            color="bg-red-500"
          >
            Stop {{ trainingText }} Training
          </custom-button>
        </div>
      </div>
      <!-- Training Board -->
      <div>
        <training-information-frame
          :trainingInformant="trainer.trainingInformant"
          v-if="trainer.trainingInformant"
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
import UploadingFrame from '../upload/UploadingFrame.vue'
import TrainingInformationFrame from '../TrainingInformationFrame.vue'
import ModelActorFrame from './ModelActorFrame.vue'
import IconCard from '../../containers/IconCard.vue'
import CustomButton from '../../simple/CustomButton.vue'
import Download from '../../../assets/svg/Download.vue'

import { mapState } from 'vuex'
import * as memory from '../../../logic/memory/model_io'
import { Trainer } from '../../../logic/training/trainer'

export default {
  name: 'TrainingFrame',
  props: {
    id: String,
    task: Object,
    helper: Object
  },
  components: {
    UploadingFrame,
    TrainingInformationFrame,
    ModelActorFrame,
    IconCard,
    CustomButton,
    Download
  },
  computed: {
    ...mapState(['useIndexedDB']),
    trainingText () {
      return this.trainer.distributedTraining ? 'Distributed' : 'Local'
    }
  },
  watch: {
    useIndexedDB (newValue) {
      this.trainer.trainingManager.setIndexedDB(newValue)
    }
  },
  data () {
    return {
      trainer: new Trainer(
        this.task,
        this.$store.getters.platform,
        this.$toast,
        this.helper,
        this.useIndexedDB
      )
    }
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
  },
  created () {
    // Disconnect from the centralized server on page close
    window.addEventListener('beforeunload', () => {
      this.trainer.client.disconnect()
    })
    this.trainer.created(this.useIndexedDB)
  },
  unmounted () {
    this.trainer.disconnect()
  }
}
</script>
