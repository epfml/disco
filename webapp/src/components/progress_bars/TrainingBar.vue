<template>
  <div class="mb-8 space-y-4 md:space-y-8">
    <div
      v-if="taskTitle !== undefined && displayTitle"
      class="flex flex-wrap font-disco text-3xl justify-center"
    >
      <span class="text-disco-blue dark:text-disco-light-cyan">{{ taskTitle }}</span>
    </div>
    <div
      v-else
      class="flex flex-wrap text-3xl text-slate-600 dark:text-slate-300 justify-center"
    >
      <DISCOllaboratives />
    </div>
    <div class="hidden md:inline-block w-full py-6">
      <div class="flex">
        <!-- Step 1 -->
        <ProgressIcon
          class="w-1/5"
          :active="true"
          :current-step="(trainingStore.step?? 0) == 0"
          :has-left-line="false"
          @click="toStep(0)"
        >
          <template #text>
            Task Selection
          </template>
          <template #icon>
            <TasksIcon class="w-full w-7 h-7" view-box="-4 -4 24 24"/>
          </template>
        </ProgressIcon>
        <!-- Step 2 -->
        <ProgressIcon
          class="w-1/5"
          :active="isActive(1)"
          :current-step="trainingStore.step == 1"
          :has-left-line="true"
          @click="toStep(1)"
        >
          <template #text>
            Task Description
          </template>
          <template #icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-full fill-current"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              width="24"
              height="24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </template>
        </ProgressIcon>
        <!-- Step 3 -->
        <ProgressIcon
          class="w-1/5"
          :active="isActive(2)"
          :current-step="trainingStore.step == 2"
          :has-left-line="true"
          @click="toStep(2)"
        >
          <template #text>
            Connect Your Data
          </template>
          <template #icon>
            <PlugIcon custom-class="w-full w-5 h-5"/>
          </template>
        </ProgressIcon>
        <!-- Step 4 -->
        <ProgressIcon
          class="w-1/5"
          :active="isActive(3)"
          :current-step="trainingStore.step == 3"
          :has-left-line="true"
          @click="toStep(3)"
        >
          <template #text>
            Model Training
          </template>
          <template #icon>
            <ModelIcon custom-class="w-full w-6 w-6" view-box="-6 -6 36 36"/>
          </template>
        </ProgressIcon>
        <!-- Step 5 -->
        <ProgressIcon
          class="w-1/5"
          :active="isActive(4)"
          :current-step="trainingStore.step == 4"
          :has-left-line="true"
          @click="toStep(4)"
        >
          <template #text>
            Model Evaluation
          </template>
          <template #icon>
            <PerformanceIcon custom-class="w-full w-7 h-7" viewBox="2 -4 12 24"/>
          </template>
        </ProgressIcon>
      </div>
    </div>
    <TrainingButtons />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import { useTasksStore } from '@/store/tasks'
import { useTrainingStore } from '@/store/training'
import { useToaster } from '@/composables/toaster'
import ProgressIcon from './ProgressIcon.vue'
import PlugIcon from '@/assets/svg/PlugIcon.vue'
import ModelIcon from '@/assets/svg/ModelIcon.vue'
import TasksIcon from '@/assets/svg/TasksIcon.vue'
import PerformanceIcon from '@/assets/svg/PerformanceIcon.vue'

import DISCOllaboratives from '@/components/simple/DISCOllaboratives.vue'
import TrainingButtons from './TrainingButtons.vue'

const router = useRouter()
const route = useRoute()
const toaster = useToaster()
const tasksStore = useTasksStore()
const trainingStore = useTrainingStore()

const taskTitle = computed(() => {
  if (trainingStore.task === undefined) return undefined
  const task = tasksStore.tasks.get(trainingStore.task)
  return task?.displayInformation?.taskTitle

})

const displayTitle = computed(() => route.fullPath !== '/list')

const isActive = (step: number): boolean => {
  const currentStep = trainingStore.step
  if (currentStep === undefined || route.fullPath === '/list') {
    return false
  } else {
    return step <= currentStep
  }
}

const toStep = (step: number): void => {
  if (route.fullPath === '/list') {
    toaster.info('Choose a DISCOllaborative first')
  } else if (step === 0) {
    router.push('/list')
    trainingStore.setStep(0)
  } else {
    trainingStore.setStep(step)
  }
}

</script>
