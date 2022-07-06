<template>
  <div class="space-y-8">
    <!-- test the model -->
    <ButtonCard
      class="mx-auto mt-10 lg:w-1/2"
      :click="assessModel"
      :button-placement="'center'"
    >
      <template #title>
        Test your model
      </template>
      <template #text>
        By clicking the button below, you will be able to assess your model against a chosen dataset of yours.
      </template>
      <template #button>
        Test
      </template>
    </ButtonCard>
    <!-- display the chart -->
    <div
      v-if="validator !== undefined"
      class="relative p-4 mx-auto lg:w-1/2 h-full bg-white rounded-md"
    >
      <!-- header -->
      <h4 class="p-4 border-b text-lg font-semibold text-slate-500">
        Testing Accuracy
      </h4>
      <!-- stats -->
      <div class="grid grid-cols-2 p-4 font-medium text-slate-500">
        <div class="text-center">
          <span class="text-2xl">{{ currentAccuracy }}</span>
          <span class="text-sm">% of testing accuracy</span>
        </div>
        <div class="text-center">
          <span class="text-2xl">{{ visitedSamples }}</span>
          <span class="text-sm">&nbsp;samples visited</span>
        </div>
      </div>
      <!-- chart -->
      <apexchart
        width="100%"
        height="200"
        type="area"
        :options="chartOptions"
        :series="[{ data: accuracyData }]"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { ConsoleLogger, dataset, EmptyMemory, isTask, Memory, ModelType, Validator } from 'discojs'
import { defineComponent } from 'vue'
import { mapState } from 'vuex'

import ButtonCard from '@/components/containers/ButtonCard.vue'
import { IndexedDB } from '@/memory'
import { chartOptions } from '@/charts'
import { success, error } from '@/toast'

export default defineComponent({
  name: 'Validator',
  components: {
    ButtonCard
  },
  props: {
    task: {
      validator: isTask,
      default: undefined
    },
    datasetBuilder: {
      type: dataset.DatasetBuilder,
      default: undefined
    },
    model: {
      type: String,
      default: undefined
    }
  },
  data () {
    return {
      validator: undefined
    }
  },
  computed: {
    ...mapState(['useIndexedDB']),
    memory (): Memory {
      return this.useIndexedDB ? new IndexedDB() : new EmptyMemory()
    },
    chartOptions (): any {
      return chartOptions
    },
    accuracyData (): number[] | undefined {
      if (this.validator === undefined) {
        return undefined
      }
      return this.validator.accuracyData().toArray()
    },
    currentAccuracy (): number {
      return this.validator.accuracy()
    },
    visitedSamples (): number {
      return this.validator.visitedSamples()
    }
  },
  methods: {
    // made a method instead of a computed property because of async
    async getValidator (): Promise<Validator | undefined> {
      if (this.model === undefined) {
        return undefined
      }
      // TODO: provide better utilities for models in memory
      const [type, task, name] = this.model.split('/').splice(2)
      const modelType = type === 'working' ? ModelType.WORKING : ModelType.SAVED
      const model = await this.memory.getModel(modelType, task, name)
      return new Validator(this.task, new ConsoleLogger(), model)
    },
    async assessModel (): Promise<void> {
      if (this.datasetBuilder.size() === 0) {
        return error(this.$toast, 'Missing dataset')
      }
      this.validator = await this.getValidator()
      if (this.validator === undefined) {
        return error(this.$toast, 'Model not found')
      }
      const dataset: dataset.Data = await this.datasetBuilder.build()
      success(this.$toast, 'Model testing started!')
      try {
        await this.validator.assess(dataset)
      } catch (e) {
        error(this.$toast, 'Model testing failed!')
        console.log(e instanceof Error ? e.message : e)
      }
    }
  }
})
</script>
