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
          :class="props.active ? 'bg-slate-500' : 'bg-slate-200'" 
        >
          <div
            class="py-1"
          />
        </div>
      </div>
      <div
        class="transition duration-400 w-10 h-10 mx-auto rounded-full text-lg text-white flex items-center hover:scale-105 hover:cursor-pointer"
        :class="(props.active ? 'bg-disco-blue border-2 border-slate-200' : 'bg-white border-2 border-slate-200') + (isCurrentStep ? ' bg-orange-300' : '') "
      >
        <span
          class="text-center w-full"
          :class="props.active ? 'text-white' : 'text-slate-500'"
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
