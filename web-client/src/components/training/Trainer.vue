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
              train alone
            </CustomButton>
            <CustomButton @click="startTraining(true)">
              train collaboratively
            </CustomButton>
          </div>
        </template>
        <template
          v-else
          #content
        >
          <div class="flex justify-center">
            <CustomButton @click="pauseTraining()">
              stop <span v-if="distributedTraining">collaborative training</span><span v-else>training</span>
            </CustomButton>
          </div>
        </template>
      </IconCard>
    </div>
    <!-- Training Board -->
    <div>
      <TrainingInformation
        :logs="logs"
        :has-validation-data="hasValidationData"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { List } from 'immutable'
import { mapStores } from 'pinia'
import { defineComponent } from 'vue'

import type { RoundLogs, Task } from '@epfml/discojs-core'
import { data, EmptyMemory, isTask, Disco, Memory, client as clients } from '@epfml/discojs-core'
import { IndexedDB } from '@epfml/discojs'

import { useMemoryStore } from '@/store/memory'
// TODO @s314cy: move to discojs-core/src/client/get.ts
import { getClient } from '@/clients'
import { useToaster } from '@/composables/toaster'
import TrainingInformation from '@/components/training/TrainingInformation.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import IconCard from '@/components/containers/IconCard.vue'

const toaster = useToaster()

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
      default: undefined as Task | undefined
    },
    datasetBuilder: data.DatasetBuilder
  },
  data (): {
    distributedTraining: boolean,
    startedTraining: boolean,
    logs: List<RoundLogs>,
    } {
    return {
      distributedTraining: false,
      startedTraining: false,
      logs: List(),
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
          logger: toaster,
          memory: this.memory,
          scheme: this.scheme,
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
    },
  },
  methods: {
    async startTraining (distributedTraining: boolean): Promise<void> {
      this.distributedTraining = distributedTraining

      if (this.datasetBuilder === undefined) {
        throw new Error('no dataset builder')
      }

      let dataset
      try {
        dataset = await this.datasetBuilder.build()
      } catch (e) {
        console.error(e)
        if (e instanceof Error && e.message.includes('provided in columnConfigs does not match any of the column names')) {
          // missing field is specified between two "quotes"
          const missingFields: String = e.message.split('"')[1].split('"')[0]
          toaster.error(`The input data is missing the field "${missingFields}"`)
        } else {
          toaster.error('Incorrect data format. Please check the expected format at the previous step.')
        }
        this.cleanState()
        return
      }

      toaster.info('Model training started')

      try {
        this.startedTraining = true
        for await (const roundLogs of this.disco.fit(dataset)) {
          this.logs = this.logs.push(roundLogs)
        }
        this.startedTraining = false
      } catch (e) {
        toaster.error('An error occurred during training')
        console.error(e)
        this.cleanState()
      }
      toaster.success('Training successfully completed')
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
