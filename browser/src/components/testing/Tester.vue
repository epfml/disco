<template>
  <div>
    <ButtonCard
      class="mx-auto mt-10 w-1/2"
      :click="testModel"
      :button-placement="'center'"
    >
      <template #title>
        Test your model
      </template>
      <template #text>
        blablabla
      </template>
      <template #button>
        Test
      </template>
    </ButtonCard>
    <div class="mx-auto">
      <div
        v-for="idx in metrics"
        :key="idx"
      >
        {{ metrics[idx] }}
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import ButtonCard from '@/components/containers/ButtonCard.vue'
import { IndexedDB } from '@/memory'

import { dataset, EmptyMemory, isTask, ModelType, Tester } from 'discojs'
import { defineComponent } from 'vue'
import { mapState } from 'vuex'

export default defineComponent({
  name: 'Tester',
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
  data (): { metrics: number[] } {
    return {
      metrics: []
    }
  },
  computed: {
    ...mapState(['useIndexedDB']),
    memory () {
      return this.useIndexedDB ? new IndexedDB() : new EmptyMemory()
    }
  },
  methods: {
    async tester (): Promise<Tester | undefined> {
      if (this.model === undefined) {
        return undefined
      }
      // TODO: provide better utilities for models in memory
      const [type, task, name] = this.model.split('/').splice(2)
      const modelType = type === 'working' ? ModelType.WORKING : ModelType.SAVED
      const model = await this.memory.getModel(modelType, task, name)
      return new Tester(this.task, console.log, model)
    },
    async testModel (): Promise<void> {
      const tester = await this.tester()
      if (tester !== undefined) {
        const data = await this.datasetBuilder.build()
        try {
          tester.testModel(data)
          this.$toast.success('Model testing started!')
        } catch (e) {
          this.$toast.error('Model testing failed')
        } finally {
          setTimeout(this.$toast.clear, 30000)
        }
      }
    }
  }
})
</script>
