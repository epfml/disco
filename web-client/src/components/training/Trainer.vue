<template>
  <div class="space-y-4 md:space-y-8">
    <!-- Train Button -->
    <div class="flex justify-center">
      <IconCard
        title-placement="center"
        class="w-3/5"
      >
        <template #title>
          Control the Training Flow
        </template>
        <template
          v-if="!startedTraining"
          #content
        >
          <div class="grid grid-cols-2 gap-8">
            <CustomButton @click="startTraining(false)">
              Train alone
            </CustomButton>
            <CustomButton @click="startTraining(true)">
              Train collaboratively
            </CustomButton>
          </div>
        </template>
        <template
          v-else
          #content
        >
          <div class="flex justify-center">
            <CustomButton @click="pauseTraining()">
              Stop <span v-if="distributedTraining">Collaborative Training</span><span v-else>Training</span>
            </CustomButton>
          </div>
        </template>
      </IconCard>
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

import { data, EmptyMemory, isTask, Task, informant, TrainingInformant, Disco, Memory, client as clients } from '@epfml/discojs-core'
import { IndexedDB } from '@epfml/discojs'

import { useMemoryStore } from '@/store/memory'
// TODO @s314cy: move to discojs-core/src/client/get.ts
import { getClient } from '@/clients'
import TrainingInformation from '@/components/training/TrainingInformation.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import IconCard from '@/components/containers/IconCard.vue'

export default defineComponent({
  name: 'Trainer',
  components: {
    TrainingInformation,
    CustomButton,
    IconCard
  },
  props: {
    task: {
      validator: isTask,
      default: undefined
    },
    datasetBuilder: {
      type: data.DatasetBuilder,
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
      trainingInformant: new informant.LocalInformant(this.task, 10)
    }
  },
  computed: {
    ...mapStores(useMemoryStore),
    client (): clients.Client {
      return getClient(this.scheme, this.task)
    },
    memory (): Memory {
      return this.memoryStore.useIndexedDB ? new IndexedDB() : new EmptyMemory()
    },
    disco (): Disco {
      return new Disco(
        this.task,
        {
          logger: this.$toast,
          memory: this.memory,
          scheme: this.scheme,
          informant: this.trainingInformant,
          client: this.client
        }
      )
    },
    scheme (): Task['trainingInformation']['scheme'] {
      if (this.distributedTraining && this.task.trainingInformation?.scheme !== undefined) {
        return this.task.trainingInformation?.scheme
      }

      // default scheme
      return 'local'
    },
    hasValidationData (): boolean {
      return this.task?.trainingInformation?.validationSplit > 0
    }
  },
  watch: {
    scheme (newScheme: Task['trainingInformation']['scheme']): void {
      const args = [this.task, 10] as const
      switch (newScheme) {
        case 'federated':
          this.trainingInformant = new informant.FederatedInformant(...args)
          break
        case 'decentralized':
          this.trainingInformant = new informant.DecentralizedInformant(...args)
          break
        case 'local':
          this.trainingInformant = new informant.LocalInformant(...args)
          break
        default: {
          // eslint-disable-next-line no-unused-vars
          const _: never = newScheme
          throw new Error('should never happen')
        }
      }
    }
  },
  methods: {
    async startTraining (distributedTraining: boolean): Promise<void> {
      this.distributedTraining = distributedTraining

      if (!this.datasetBuilder.built) {
        try {
          this.dataset = await this.datasetBuilder.build()
        } catch (e) {
          console.error(e.message)
          if (e.message.includes('provided in columnConfigs does not match any of the column names')) {
            // missing field is specified between two "quotes"
            const missingFields: String = e.message.split('"')[1].split('"')[0]
            this.$toast.error(`The input data is missing the field "${missingFields}"`)
          } else {
            this.$toast.error('Incorrect data format. Please check the expected format at the previous step.')
          }
          this.cleanState()
          return
        }
      }

      this.$toast.info('Model training started')

      try {
        this.startedTraining = true
        await this.disco.fit(this.dataset)
        this.startedTraining = false
      } catch (e) {
        this.$toast.error('An error occurred during training')
        console.error(e)
        this.cleanState()
      }
      this.$toast.success('Training successfully completed')
    },
    cleanState (): void {
      this.distributedTraining = false
      this.startedTraining = false
    },
    async pauseTraining (): Promise<void> {
      await this.disco.pause()
      this.startedTraining = false
    }
  }
})
</script>
