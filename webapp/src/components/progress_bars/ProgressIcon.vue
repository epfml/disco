<template>
  <div>
    <div class="relative mb-4">
      <div
        v-if="props.hasLeftLine"
        class="absolute"
        style="width: calc(100% - 2.5rem - 1rem); top: 50%; transform: translate(-50%, -50%)"
      >
        <div
          class="rounded-sm transition duration-400"
          :class="props.active ? 'bg-disco-blue dark:bg-disco-light-blue' : 'bg-slate-200 dark:bg-slate-600'" 
        >
          <div class="py-1" />
        </div>
      </div>
      <div
        class="flex items-center mx-auto transition duration-400 
        w-10 h-10 rounded-full hover:scale-105 hover:cursor-pointer"
        :class="(props.active ? 'bg-disco-blue dark:bg-disco-light-blue border-4 border-slate-200 dark:border-slate-600'
          : 'bg-white dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-600') + (isCurrentStep ? ' bg-disco-orange dark:bg-disco-orange' : '')"
      >
        <span
          class="text-center w-full dark:text-white"
          :class="props.active ? 'text-white' : 'text-body-light'"
        >
          <slot name="icon" />
        </span>
      </div>
    </div>
    <!-- Text -->
    <div class="text-center">
      <slot name="text" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
interface Props {
  active: boolean
  currentStep: boolean
  hasLeftLine: boolean
}

const props = defineProps<Props>()
const isCurrentStep = toRef(props, 'currentStep')

</script>
