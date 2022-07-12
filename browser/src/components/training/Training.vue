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
          Train Locally
        </CustomButton>
      </div>
      <div class="text-center">
        <CustomButton
          @click="startTraining(true)"
        >
          Train Collaboratively
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
        Stop <span v-if="distributedTraining">Distributed</span><span v-else>Local</span> Training
      </CustomButton>
    </div>

    <!-- Training Board -->
    <div>
      <TrainingInformation :training-informant="trainingInformant" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'vuex'

import { dataset, EmptyMemory, isTask, TrainingInformant, TrainingSchemes, Disco, Memory, Client } from 'discojs'

import { getClient } from '@/clients'
import { IndexedDB } from '@/memory'
import TrainingInformation from '@/components/training/TrainingInformation.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import { error } from '@/toast'

export default defineComponent({
  name: 'Training',
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
      trainingInformant: new TrainingInformant(10, this.task.taskID, TrainingSchemes.LOCAL)
    }
  },
  computed: {
    ...mapState(['useIndexedDB']),
    client (): Client {
      return getClient(this.scheme, this.task)
    },
    memory (): Memory {
      return this.useIndexedDB ? new IndexedDB() : new EmptyMemory()
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
    }
  },
  watch: {
    scheme (newScheme: TrainingSchemes): void {
      this.trainingInformant = new TrainingInformant(10, this.task.taskID, newScheme)
    }
  },
  methods: {
    async startTraining (distributedTraining: boolean) {
      this.distributedTraining = distributedTraining

      try {
        if (!this.datasetBuilder.isBuilt()) {
          this.dataset = await this.datasetBuilder
            .build()
        }

        await this.client.connect()
        this.startedTraining = true
        await this.disco.startTraining(this.dataset)
        this.startedTraining = false
      } catch (e) {
        error(this.$toast, e instanceof Error ? e.message : e.toString())

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
