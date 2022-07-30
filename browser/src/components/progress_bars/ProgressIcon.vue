<template>
  <div>
    <div class="relative mb-4">
      <div
        v-if="props.lined"
        class="absolute flex align-center items-center align-middle content-center"
        style="width: calc(100% - 2.5rem - 1rem); top: 50%; transform: translate(-50%, -50%)"
      >
        <div
          class="w-full bg-slate-200 rounded items-center align-middle align-center flex-1"
        >
          <div
            class="py-1"
          />
        </div>
      </div>
      <div
        class="transition duration-400 w-10 h-10 mx-auto rounded-full text-lg text-white flex items-center hover:scale-105 hover:cursor-pointer"
        :class="props.active ? 'bg-disco-blue' : 'bg-white border-2 border-slate-200'"
      >
        <span
          class="text-center w-full"
          :class="props.active ? 'text-white' : 'text-slate-700'"
        >
          <slot name="icon" />
        </span>
      </div>
    </div>
    <!-- Text -->
    <div class="text-xs text-center md:text-base">
      <slot name="text" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

interface Props {
  active: boolean
  lined: boolean
}

const props = defineProps<Props>()
</script>
