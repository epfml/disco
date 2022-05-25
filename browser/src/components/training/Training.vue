<template>
  <div>
    <!-- Train Button -->
    <div
      v-if="trainingInformant === undefined"
      class="grid grid-cols-2 gap-8 py-6 items-center"
    >
      <div class="text-center">
        <CustomButton
          @click="startTraining(false)"
        >
          Train Locally
        </CustomButton>
      </div>
      <div class="text-center">
        <CustomButton
          @click="startTraining(true)"
        >
          Collaborative Training
        </CustomButton>
      </div>
    </div>
    <div v-else>
      <CustomButton
        @click="stopTraining()"
      >
        Stop <span v-if="distributedTraining">Distributed</span><span v-else>Local</span> Training
      </CustomButton>
    </div>

    <!-- Training Board -->
    <div>
      <TrainingInformation
        v-if="trainingInformant !== undefined"
        :training-informant="trainingInformant"
      />
    </div>

    <!-- Save the model button -->
    <IconCard
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
          <CustomButton
            @click="saveModel()"
          >
            Save My model
          </CustomButton>
        </div>
      </template>
    </IconCard>
    <!-- Test the model button -->
    <IconCard
      header="Test the model"
      description="Once you have finished training your model it might be a great idea
            to go test it."
    >
      <template #icon>
        <Download />
      </template>
      <template #extra>
        <!-- Description -->
        <div class="relative p-4 overflow-x-hidden">
          <span
            style="white-space: pre-line"
            class="text-sm text-gray-500 dark:text-light"
          />
        </div>
      </template>
    </IconCard>
  </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'

import { dataset, training, EmptyMemory, isTask, TrainingInformant, TrainingSchemes } from 'discojs'

import { IndexedDB } from '@/memory'
import TrainingInformation from './TrainingInformation.vue'
import IconCard from '@/components/containers/IconCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import Download from '@/assets/svg/Download.vue'

import { getClient } from '@/clients'

export default {
  name: 'Training',
  components: {
    TrainingInformation,
    IconCard,
    CustomButton,
    Download
  },
  props: {
    task: {
      validator: isTask,
      default: undefined
    },
    datasetBuilder: {
      type: dataset.DatasetBuilder,
      default: undefined
    }
  },
  data () {
    return {
      disco: undefined,
      distributedTraining: undefined,
      trainingInformant: undefined,
      memory: new IndexedDB()
    }
  },
  computed: {
    ...mapState(['useIndexedDB'])
  },
  watch: {
    useIndexedDB (newValue: boolean) {
      this.memory = newValue ? new IndexedDB() : new EmptyMemory()
    }
  },

  methods: {
    async startTraining (distributedTraining: boolean) {
      this.distributedTraining = distributedTraining

      let scheme
      if (this.distributedTraining) {
        if (this.task.trainingInformation?.scheme === 'Federated') {
          scheme = TrainingSchemes.FEDERATED
        } else {
          scheme = TrainingSchemes.DECENTRALIZED
        }
      } else {
        scheme = TrainingSchemes.LOCAL
      }

      this.trainingInformant = new TrainingInformant(10, this.task.taskID, scheme)

      const client = getClient(scheme, this.task)
      await client.connect()

      this.disco = new training.Disco(
        this.task,
        this.$toast,
        this.memory,
        scheme,
        this.trainingInformant,
        client
      )

      try {
        if (!this.datasetBuilder.isBuilt()) {
          this.dataset = await this.datasetBuilder
            .build()
        }

        this.disco.startTraining(this.dataset)
      } catch (e) {
        const msg = e instanceof Error ? e.message : e.toString()
        this.$toast.error(msg)
        setTimeout(this.$toast.clear, 30000)

        // clean generated state
        this.disco = undefined
        this.trainingInformant = undefined
      }
    },
    async stopTraining () {
      await this.disco.stopTraining()
      this.trainingInformant = undefined
    },
    async saveModel () {
      if (this.memory !== undefined) {
        await this.memory.saveWorkingModel(
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
