<template>
  <div>
    <!-- Train Button -->
    <div
      v-if="!startedTraining"
      class="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 items-center"
    >
      <div class="text-center">
        <CustomButton
          @click="startTraining(false)"
        >
          Train alone
        </CustomButton>
      </div>
      <div class="text-center">
        <CustomButton
          @click="startTraining(true)"
        >
          Train collaboratively
        </CustomButton>
      </div>
    </div>
    <div
      v-else
      class="text-center py-6"
    >
      <CustomButton
        @click="stopTraining()"
      >
        Stop <span v-if="distributedTraining">Collaborative Training</span><span v-else>Training</span>
      </CustomButton>
    </div>

    <!-- Training Board -->
    <div>
      <TrainingInformation
        :training-informant="trainingInformant"
        :has-validation-data="hasValidationData"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { browser, dataset, EmptyMemory, isTask, informant, TrainingInformant, TrainingSchemes, Disco, Memory, Client } from '@epfml/discojs'

import { useMemoryStore } from '@/store/memory'
import { getClient } from '@/clients'
import TrainingInformation from '@/components/training/TrainingInformation.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

export default defineComponent({
  name: 'Trainer',
  components: {
    TrainingInformation,
    CustomButton
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
  data (): {
    distributedTraining: boolean,
    startedTraining: boolean,
    trainingInformant: TrainingInformant
    } {
    return {
      distributedTraining: false,
      startedTraining: false,
      trainingInformant: new informant.LocalInformant(this.task.taskID, 10)
    }
  },
  computed: {
    ...mapStores(useMemoryStore),
    client (): Client {
      return getClient(this.scheme, this.task)
    },
    memory (): Memory {
      return this.memoryStore.useIndexedDB ? new browser.IndexedDB() : new EmptyMemory()
    },
    disco (): Disco {
      return new Disco(
        this.task,
        this.$toast,
        this.memory,
        this.scheme,
        this.trainingInformant,
        this.client
      )
    },
    scheme (): TrainingSchemes {
      if (this.distributedTraining) {
        switch (this.task.trainingInformation?.scheme) {
          case 'Federated':
            return TrainingSchemes.FEDERATED
          case 'Decentralized':
            return TrainingSchemes.DECENTRALIZED
        }
      }
      // default scheme
      return TrainingSchemes.LOCAL
    },
    hasValidationData (): boolean {
      return this.task?.trainingInformation?.validationSplit > 0
    }
  },
  watch: {
    scheme (newScheme: TrainingSchemes): void {
      const args = [this.task.taskID, 10] as const
      switch (newScheme) {
        case TrainingSchemes.FEDERATED:
          this.trainingInformant = new informant.FederatedInformant(...args)
          break
        case TrainingSchemes.DECENTRALIZED:
          this.trainingInformant = new informant.DecentralizedInformant(...args)
          break
        default:
          this.trainingInformant = new informant.LocalInformant(...args)
          break
      }
    }
  },
  methods: {
    async startTraining (distributedTraining: boolean) {
      this.distributedTraining = distributedTraining

      try {
        if (!this.datasetBuilder.isBuilt()) {
          this.dataset = await this.datasetBuilder.build()
        }

        await this.client.connect()
        this.startedTraining = true
        await this.disco.startTraining(this.dataset)
        this.startedTraining = false
      } catch (e) {
        this.$toast.error(e instanceof Error ? e.message : e.toString())

        // clean generated state
        this.distributedTraining = false
        this.startedTraining = false
      }
    },
    async stopTraining () {
      await this.disco.stopTraining()
      this.isTraining = false
    }
  }
})
</script>
