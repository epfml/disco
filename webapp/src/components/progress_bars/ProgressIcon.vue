<template>
  <div>
    <div class="relative mb-4">
      <div
        v-if="props.hasLeftLine"
        class="absolute flex align-center items-center align-middle content-center"
        style="width: calc(100% - 2.5rem - 1rem); top: 50%; transform: translate(-50%, -50%)"
      >
        <div
          class="w-full rounded items-center align-middle align-center flex-1  transition duration-400"
          :class="props.active ? 'bg-disco-blue dark:bg-disco-light-blue' : 'bg-slate-200 dark:bg-slate-600'" 
        >
          <div class="py-1" />
        </div>
      </div>
      <div
        class="transition duration-400 w-10 h-10 mx-auto rounded-full text-lg text-white flex items-center hover:scale-105 hover:cursor-pointer"
        :class="(props.active ? 'bg-disco-blue dark:bg-disco-light-blue border-4 border-slate-200 dark:border-slate-600' : 'bg-white dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-600') + (isCurrentStep ? ' bg-orange-300' : '') "
      >
        <span
          class="text-center w-full"
          :class="props.active ? 'text-white dark:text-white' : 'text-slate-500 dark:text-slate-200'"
        >
          <slot name="icon" />
        </span>
      </div>
    </div>
    <!-- Text -->
    <div class="text-xs text-center md:text-base text-slate-700">
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
