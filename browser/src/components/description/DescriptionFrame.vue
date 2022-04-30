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
    <div class="flex items-center justify-center p-4">
      <CustomButton
        id="train-model-button"
        :center="true"
        @click="goToTraining()"
      >
        Join Training
      </CustomButton>
    </div>
  </div>
</template>

<script lang="ts">
import CustomButton from '@/components/simple/CustomButton.vue'
import Tasks from '@/assets/svg/Tasks.vue'
import Model from '@/assets/svg/Model.vue'
import IconCard from '@/components/containers/IconCard.vue'

import { mapState } from 'vuex'
import { Task } from 'discojs'

export default {
  name: 'DescriptionFrame',
  components: {
    CustomButton,
    Tasks,
    Model,
    IconCard
  },
  props: {
    overviewText: {
      type: String,
      default: ''
    },
    modelText: {
      type: String,
      default: ''
    },
    tradeOffsText: {
      type: String,
      default: ''
    },
    id: {
      type: String,
      default: ''
    },
    task: {
      type: Task,
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
    ...mapState(['isDark'])
  },
  methods: {
    async goToTraining (): Promise<void> {
      this.$emit('next-step')
    }
  }
}
</script>
