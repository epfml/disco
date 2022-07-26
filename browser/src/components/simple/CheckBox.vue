<script setup lang="ts">

import { defineEmits } from 'vue'

interface Emits {
  (e: 'clicked'): void
}
const emit = defineEmits<Emits>()

const clicked = () => { emit('clicked') }

</script>

<template>
  <div
    class="flex flex-row items-center space-x-2"
  >
    <input
      id="box"
      class="group appearance-none h-5 w-5 focus:outline-none transition duration-200 border-2 border-disco-cyan rounded-xl cursor-pointer align-top bg-contain bg-no-repeat bg-center float-left checked:bg-disco-cyan"
      type="checkbox"
      @click="clicked"
    >
    <div class="capitalize">
      <slot />
    </div>
  </div>
</template>
