<template>
  <div class="grid grid-cols-2 gap-8 mt-10">
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
import { IndexedDB, pathFor } from '@/memory'

import { EmptyMemory, Memory, ModelType, isTask } from 'discojs'
import { mapMutations, mapState } from 'vuex'

export default {
  components: { ButtonCard },
  props: {
    task: {
      validator: isTask,
      default: undefined
    }
  },
  data (): { memory: Memory } {
    return {
      memory: undefined
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
    ...mapMutations(['setTestingModel']),
    testModel () {
      const path = pathFor(ModelType.WORKING, this.task.taskID, this.task.trainingInformation.modelID)
      this.setTestingModel(path)
      this.$router.push({ path: '/testing' })
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
