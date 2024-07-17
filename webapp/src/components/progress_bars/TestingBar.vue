<template>
  <div class="space-y-8 mb-8">
    <h1 class="text-disco-cyan font-disco text-3xl text-center">
      Evaluation
    </h1>
    <div class="hidden md:flex mx-auto">
      <ProgressIcon
        class="w-1/3"
        :has-left-line="false"
        :active="true"
        :current-step="validationStore.step == 0"
        @click="handleRoute(0)"
      >
        <template #text>
          Choose Model
        </template>
        <template #icon>
          <ModelIcon custom-class="w-full w-6 w-6" view-box="-6 -6 36 36"/>
        </template>
      </ProgressIcon>
      <ProgressIcon
        class="w-1/3"
        :has-left-line="true"
        :active="isActive(1)"
        :current-step="validationStore.step == 1"
        @click="handleRoute(1)"
      >
        <template #text>
          Connect Your Data ({{ testing }})
        </template>
        <template #icon>
          <PlugIcon custom-class="w-full w-5 h-5"/>
        </template>
      </ProgressIcon>
      <ProgressIcon
        class="w-1/3"
        :has-left-line="true"
        :active="isActive(2)"
        :current-step="validationStore.step == 2"
        @click="handleRoute(2)"
      >
        <template #text>
          Evaluate Your Model ({{ testing }})
        </template>
        <template #icon>
          <PerformanceIcon custom-class="w-full w-7 h-7" viewBox="2 -4 12 24"/>
        </template>
      </ProgressIcon>
    </div>
    <div
      v-show="showPrev || showNext"
      class="flex flex-row justify-center gap-4 md:gap-8"
    >
      <div class="text-center md:text-right">
        <CustomButton
          v-show="showPrev"
          @click="prevStep"
        >
          previous
        </CustomButton>
      </div>
      <div class="text-center md:text-left">
        <CustomButton
          v-show="showNext"
          @click="nextStep"
        >
          next
        </CustomButton>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">

import { computed } from 'vue'
import { useValidationStore } from '@/store/validation'
import { useMemoryStore } from '@/store/memory'
import { useToaster } from '@/composables/toaster'
import ProgressIcon from './ProgressIcon.vue'
import ModelIcon from '@/assets/svg/ModelIcon.vue'
import PlugIcon from '@/assets/svg/PlugIcon.vue'
import PerformanceIcon from '@/assets/svg/PerformanceIcon.vue'

import CustomButton from '@/components/simple/CustomButton.vue'

const toaster = useToaster()
const validationStore = useValidationStore()
const memoryStore = useMemoryStore()

const testing = computed(() => validationStore.isOnlyPrediction ? 'Prediction' : 'Testing')


const isActive = (step: number): boolean => step <= validationStore.step
const isCurrent = (step: number): boolean => step == validationStore.step

const handleRoute = (step: number): void => {
  if (memoryStore.models.size === 0 || validationStore.model === undefined) {
    toaster.error('Select a model to evaluate beforehand')
  } else {
    validationStore.step = step
  }
}

</script>
