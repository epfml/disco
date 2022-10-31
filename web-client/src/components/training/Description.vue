<template>
  <div class="space-y-4 md:space-y-8">
    <IconCard class="mb-3">
      <template #title>
        The Task
      </template>
      <template #icon>
        <Tasks />
      </template>
      <template
        v-if="overviewText !== undefined"
        #content
      >
        <div v-html="overviewText" />
      </template>
      <template
        v-else
        #content
      >
        <span class="italic">
          No task description was provided by the task's author.
        </span>
      </template>
    </IconCard>

    <IconCard v-if="modelText !== undefined">
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
import { defineComponent } from 'vue'

import { isTask } from '@epfml/discojs'

import Tasks from '@/assets/svg/Tasks.vue'
import Model from '@/assets/svg/Model.vue'
import IconCard from '@/components/containers/IconCard.vue'
import ModelCaching from '@/components/training/ModelCaching.vue'

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
    overviewText (): string | undefined {
      if (this.task.displayInformation.summary === undefined) {
        return undefined
      }
      return Object.values(this.task.displayInformation.summary).join('<br><br>')
    },
    tradeOffsText (): string | undefined {
      return this.task.displayInformation.tradeOffsText
    },
    modelText (): string | undefined {
      return this.task.displayInformation.model
    }
  }
})
</script>
