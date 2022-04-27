<template>
  <base-layout>
    <div>
      <progress-bar :step="currentStep" />
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component
            :is="Component"
            @next-step="nextStep"
          />
        </keep-alive>
      </router-view>
    </div>
  </base-layout>
</template>

<script lang="ts">
import BaseLayout from '../containers/BaseLayout.vue'
import ProgressBar from '../ProgressBar.vue'

import { Task } from 'discojs'

const STEPS = ['list', 'description', 'training']

export default {
  name: 'MainTaskFrame',
  components: { BaseLayout, ProgressBar },
  props: {
    task: {
      type: Task,
      default: undefined
    }
  },
  data (): { currentStep: number } {
    return {
      currentStep: 1
    }
  },
  mounted () {
    const step = STEPS[this.currentStep]
    this.$router.replace({ path: `/${this.task.taskID}/${step}` })
  },
  methods: {
    /**
     * This component is responsible for switching between frames and updating the progress
     * bar accordingly.
     */
    nextStep () {
      if (this.currentStep < 3) {
        const nextStep = STEPS[++this.currentStep]
        this.$router.push({ path: `/${this.task.taskID}/${nextStep}` })
      }
    }
  }
}
</script>
