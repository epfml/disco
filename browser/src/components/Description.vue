<template>
  <div>
    <a id="overview-target">
      <IconCard
        header="The task"
        :description="overviewText"
      >
        <template #icon><Tasks /></template>
      </IconCard>
    </a>

    <a id="limitations-target">
      <IconCard
        header="The model"
        :description="modelText"
      >
        <template #icon><Model /></template>
      </IconCard>
    </a>
    <ModelCaching
      :task="task"
    />
  </div>
</template>

<script lang="ts">
import Tasks from '@/assets/svg/Tasks.vue'
import Model from '@/assets/svg/Model.vue'
import IconCard from '@/components/containers/IconCard.vue'
import ModelCaching from '@/components/ModelCaching.vue'

import { mapState } from 'vuex'
import { isTask } from 'discojs'

export default {
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
    ...mapState(['isDark']),
    overviewText (): string {
      return this.task.displayInformation.overview
    },
    tradeOffsText (): string {
      return this.task.displayInformation.tradeOffsText
    },
    modelText (): string {
      return this.task.displayInformation.model
    }
  }
}
</script>
