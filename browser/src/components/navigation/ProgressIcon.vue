<template>
  <div class="w-1/5">
    <div class="relative mb-4">
      <div
        v-if="lined"
        class="absolute flex align-center items-center align-middle content-center"
        style="width: calc(100% - 2.5rem - 1rem); top: 50%; transform: translate(-50%, -50%)"
      >
        <div class="w-full bg-gray-200 rounded items-center align-middle align-center flex-1">
          <div
            class="w-0 bg-green-300 py-1 rounded"
            style="width: 0%;"
          />
        </div>
      </div>
      <div
        class="transition duration-400 w-10 h-10 mx-auto rounded-full text-lg text-white flex items-center"
        :class="isActive ? 'bg-disco-blue' : 'bg-white border-2 border-slate-200'"
      >
        <span
          class="text-center w-full"
          :class="isActive ? 'text-white' : 'text-slate-700'"
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

<script lang="ts">
export default {
  name: 'ProgressIcon',
  props: {
    text: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: false
    },
    lined: {
      type: Boolean,
      default: false
    }
  }
}
</script>
