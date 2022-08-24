<template>
  <div class="space-y-4 md:space-y-8">
    <IconCard>
      <template #title>
        The Task
      </template>
      <template #icon>
        <Tasks />
      </template>
      <template #content>
        <div v-html="overviewText" />
      </template>
    </IconCard>

    <IconCard>
      <template #title>
        The Model
      </template>
      <template #icon>
        <Model />
      </template>
      <template #content>
        <div v-html="modelText" />
      </template>
    </IconCard>
    <ModelCaching
      :task="task"
    />
  </div>
</template>

<script lang="ts">
import { isTask } from '@epfml/discojs'

import Tasks from '@/assets/svg/Tasks.vue'
import Model from '@/assets/svg/Model.vue'
import IconCard from '@/components/containers/IconCard.vue'
import ModelCaching from '@/components/training/ModelCaching.vue'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Description',
  components: {
    ModelCaching,
    Tasks,
    Model,
    IconCard
  },
  props: {
    id: {
      type: String,
      default: ''
    },
    task: {
      validator: isTask,
      default: undefined
    }
  },
  data () {
    return {
      isModelCreated: false,
      workingModelExists: false,
      workingModelExistsOnMount: false,
      useWorkingModel: false,
      dateSaved: '',
      hourSaved: ''
    }
  },
  computed: {
    overviewText (): string {
      return Object.values(this.task.displayInformation.summary).join('<br><br>')
    },
    tradeOffsText (): string {
      return this.task.displayInformation.tradeOffsText
    },
    modelText (): string {
      return this.task.displayInformation.model
    }
  }
})
</script>
