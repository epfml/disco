<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 items-stretch">
    <!-- Save the model -->
    <ButtonCard
      :click="testModel"
      :button-placement="'center'"
    >
      <template #title>
        Test the model
      </template>
      <template #text>
        Once you have finished training your model it might be a great idea
        to go test it.
      </template>
      <template #button>
        Test model
      </template>
    </ButtonCard>
    <!-- Test the model -->
    <ButtonCard
      :click="saveModel"
      :button-placement="'center'"
    >
      <template #title>
        Save the model
      </template>
      <template #text>
        If you are satisfied with the performance of the model, don't
        forget to save the model by clicking on the button below. The next
        time you will load the application, you will be able to use your
        saved model.
      </template>
      <template #button>
        Save model
      </template>
    </ButtonCard>
  </div>
</template>

<script lang="ts">
import ButtonCard from '@/components/containers/ButtonCard.vue'
import { IndexedDB } from '@/memory'

import { EmptyMemory, Memory, ModelType, isTask, ModelInfo } from 'discojs'
import { defineComponent } from 'vue'
import { mapMutations, mapState } from 'vuex'

export default defineComponent({
  components: { ButtonCard },
  props: {
    task: {
      validator: isTask,
      default: undefined
    }
  },
  computed: {
    ...mapState(['useIndexedDB', 'models']),
    memory (): Memory {
      return this.usedIndexedDB ? new IndexedDB() : new EmptyMemory()
    },
    modelInfo (): ModelInfo {
      return {
        type: ModelType.WORKING,
        taskID: this.task.taskID,
        name: this.task.trainingInformation.modelID
      }
    }
  },
  methods: {
    ...mapMutations(['setTestingModel']),
    testModel () {
      if (this.memory.contains(this.modelInfo)) {
        this.setTestingModel(this.modelInfo)
        this.$router.push({ path: '/testing' })
      } else {
        this.$toast.error('Model was not trained!')
        setTimeout(this.$toast.clear, 30000)
      }
    },
    async saveModel () {
      if (!(this.memory instanceof EmptyMemory)) {
        await this.memory.saveWorkingModel(this.modelInfo)
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
})
</script>
