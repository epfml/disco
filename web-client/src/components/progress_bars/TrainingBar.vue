<template>
  <div class="mb-8 md:mb-16 space-y-4 md:space-y-8">
    <div
      v-if="scheme !== undefined && displayTitle"
      class="flex flex-wrap font-disco text-3xl justify-center"
    >
      <span class="text-disco-blue">{{ scheme }}</span><span class="text-disco-cyan">&nbsp;Learning</span>
    </div>
    <div
      v-else
      class="flex flex-wrap text-3xl text-slate-600 justify-center"
    >
      <span class="font-disco text-disco-cyan">DIS</span><span class="font-disco text-disco-blue">CO</span>llaboratives
    </div>
    <div class="hidden md:inline-block w-full py-6">
      <div class="flex">
        <!-- Step 1 -->
        <ProgressIcon
          class="w-1/5"
          :active="true"
          :lined="false"
          @click="toStep(0)"
        >
          <template #text>
            Choose Task
          </template>
          <template #icon>
            <svg
              class="w-full fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                class="heroicon-ui"
                d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2zm14 8V5H5v6h14zm0 2H5v6h14v-6zM8 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"
              />
            </svg>
          </template>
        </ProgressIcon>
        <!-- Step 2 -->
        <ProgressIcon
          class="w-1/5"
          :active="isActive(1)"
          :lined="true"
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
          :lined="true"
          @click="toStep(2)"
        >
          <template #text>
            Connect Your Data
          </template>
          <template #icon>
            <svg
              class="w-full fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                class="heroicon-ui"
                d="M9 4.58V4c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v.58a8 8 0 0 1 1.92 1.11l.5-.29a2 2 0 0 1 2.74.73l1 1.74a2 2 0 0 1-.73 2.73l-.5.29a8.06 8.06 0 0 1 0 2.22l.5.3a2 2 0 0 1 .73 2.72l-1 1.74a2 2 0 0 1-2.73.73l-.5-.3A8 8 0 0 1 15 19.43V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.58a8 8 0 0 1-1.92-1.11l-.5.29a2 2 0 0 1-2.74-.73l-1-1.74a2 2 0 0 1 .73-2.73l.5-.29a8.06 8.06 0 0 1 0-2.22l-.5-.3a2 2 0 0 1-.73-2.72l1-1.74a2 2 0 0 1 2.73-.73l.5.3A8 8 0 0 1 9 4.57zM7.88 7.64l-.54.51-1.77-1.02-1 1.74 1.76 1.01-.17.73a6.02 6.02 0 0 0 0 2.78l.17.73-1.76 1.01 1 1.74 1.77-1.02.54.51a6 6 0 0 0 2.4 1.4l.72.2V20h2v-2.04l.71-.2a6 6 0 0 0 2.41-1.4l.54-.51 1.77 1.02 1-1.74-1.76-1.01.17-.73a6.02 6.02 0 0 0 0-2.78l-.17-.73 1.76-1.01-1-1.74-1.77 1.02-.54-.51a6 6 0 0 0-2.4-1.4l-.72-.2V4h-2v2.04l-.71.2a6 6 0 0 0-2.41 1.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
              />
            </svg>
          </template>
        </ProgressIcon>
        <!-- Step 4 -->
        <ProgressIcon
          class="w-1/5"
          :active="isActive(3)"
          :lined="true"
          @click="toStep(3)"
        >
          <template #text>
            Train Your Model
          </template>
          <template #icon>
            <svg
              class="w-full fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                class="heroicon-ui"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </template>
        </ProgressIcon>
        <!-- Step 5 -->
        <ProgressIcon
          class="w-1/5"
          :active="isActive(4)"
          :lined="true"
          @click="toStep(4)"
        >
          <template #text>
            Evaluate Your Model
          </template>
          <template #icon>
            <svg
              class="w-full fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                class="heroicon-ui"
                d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-2.3-8.7l1.3 1.29 3.3-3.3a1 1 0 0 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-2-2a1 1 0 0 1 1.4-1.42z"
              />
            </svg>
          </template>
        </ProgressIcon>
      </div>
      <div
        v-show="route.fullPath !== '/list'"
        class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-8 md:mt-12"
      >
        <div class="text-center md:text-right">
          <CustomButton
            v-show="trainingStore.step !== undefined && trainingStore.step >= 1"
            @click="prevStepOrList"
          >
            previous
          </CustomButton>
        </div>
        <div class="text-center md:text-left">
          <CustomButton
            v-show="trainingStore.step !== undefined && trainingStore.step <= 3"
            @click="nextStep"
          >
            next
          </CustomButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import { useTasksStore } from '@/store/tasks'
import { useTrainingStore } from '@/store/training'
import { useToaster } from '@/composables/toaster'
import ProgressIcon from './ProgressIcon.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

const router = useRouter()
const route = useRoute()
const toaster = useToaster()
const tasksStore = useTasksStore()
const trainingStore = useTrainingStore()

const scheme = computed(() => {
  if (trainingStore.task === undefined) return undefined
  const task = tasksStore.tasks.get(trainingStore.task)
  return task?.trainingInformation?.scheme
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
    if (trainingStore.task !== undefined) {
      router.push(trainingStore.task)
    } else {
      toaster.error('Please select a task first')
    }
  } else if (step === 0) {
    router.push('/list')
  } else {
    trainingStore.setStep(step)
  }
}

const prevStepOrList = (): void => {
  if (trainingStore.step === 1) {
    router.push({ path: '/list' })
  } else {
    trainingStore.prevStep()
  }
}

const nextStep = (): void => {
  trainingStore.nextStep()
}
</script>
