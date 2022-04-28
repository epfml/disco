<template>
  <base-layout>
    <div>
      <progress-bar :step="progress" />
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component
            :is="Component"
            @refresh-step="refreshStep"
            @next-step="nextStep"
            @prev-step="prevStep"
          />
        </keep-alive>
      </router-view>
    </div>
  </base-layout>
</template>

<script lang="ts">
import BaseLayout from '../containers/BaseLayout.vue'
import ProgressBar from './ProgressBar.vue'

import { Task } from 'discojs'

const STEPS = ['list', 'description', 'training']
// const STEPS = ['list', 'description', 'dataset', 'training']

export default {
  name: 'MainTaskFrame',
  components: { BaseLayout, ProgressBar },
  props: {
    id: {
      type: String,
      default: ''
    },
    task: {
      type: Task,
      default: undefined
    }
  },
  data (): { step: number, progress: number } {
    return {
      step: 1,
      progress: 1
    }
  },
  mounted () {
    console.log(`Mounting MainTaskFrame for ${this.task.displayInformation.taskTitle}`)
  },
  // TODO: @s314cy move replace logic to subcomponents which communicate via events
  activated () {
    console.log(`Activating MainTaskFrame for ${this.task.displayInformation.taskTitle}`)
    this.step = this.progress
    const step = STEPS[this.progress]
    this.$router.replace({ path: `/${this.task.taskID}/${step}` })
  },
  methods: {
    refreshStep (step: number) {
      if (step >= 1 && step <= 3) {
        this.step = step
        this.progress = Math.max(this.progress, step)
      }
    },
    nextStep () {
      this.step = Math.min(3, this.step + 1)
      this.progress = Math.max(this.progress, this.step)
      const nextStep = STEPS[this.step]
      this.$router.replace({ path: `/${this.task.taskID}/${nextStep}` })
    },
    prevStep () {
      this.step = Math.max(1, this.step - 1)
      const prevStep = STEPS[this.step]
      this.$router.replace({ path: `${this.task.taskID}/${prevStep}` })
    }
  }
}
</script>
