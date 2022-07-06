<template>
  <div>
    <!-- Train Button -->
    <div
      v-if="trainingInformant === undefined"
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
      <TrainingInformation
        v-if="trainingInformant !== undefined"
        :training-informant="trainingInformant"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapState } from 'vuex'

import { dataset, training, EmptyMemory, isTask, TrainingInformant, TrainingSchemes } from 'discojs'

import { getClient } from '@/clients'
import { IndexedDB } from '@/memory'
import TrainingInformation from '@/components/training/TrainingInformation.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

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

      let scheme: TrainingSchemes
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

        await this.disco.startTraining(this.dataset)
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
    }
  }
})
</script>
