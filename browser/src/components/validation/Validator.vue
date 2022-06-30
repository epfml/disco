<template>
  <div>
    <ButtonCard
      class="mx-auto mt-10 w-1/2"
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
    <div class="mx-auto">
      <!-- TODO @s314cy: insert graph informant content -->
    </div>
  </div>
</template>
<script lang="ts">
import ButtonCard from '@/components/containers/ButtonCard.vue'
import { IndexedDB } from '@/memory'

import { dataset, EmptyMemory, isTask, ModelType, Validator } from 'discojs'
import { defineComponent } from 'vue'
import { mapState } from 'vuex'

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
  computed: {
    ...mapState(['useIndexedDB']),
    memory () {
      return this.useIndexedDB ? new IndexedDB() : new EmptyMemory()
    }
  },
  methods: {
    async validator (): Promise<Validator | undefined> {
      if (this.model === undefined) {
        return undefined
      }
      // TODO: provide better utilities for models in memory
      const [type, task, name] = this.model.split('/').splice(2)
      const modelType = type === 'working' ? ModelType.WORKING : ModelType.SAVED
      const model = await this.memory.getModel(modelType, task, name)
      return new Validator(this.task, console.log, model)
    },
    async assessModel (): Promise<void> {
      const validator = await this.validator()
      if (validator !== undefined) {
        const data = await this.datasetBuilder.build()
        try {
          validator.assess(data)
          this.$toast.success('Model testing started!')
        } catch (e) {
          this.$toast.error('Model testing failed')
        }
      } else {
        this.$toast.error('Model testing failed')
      }
      setTimeout(this.$toast.clear, 30000)
    }
  }
})
</script>
