<template>
  <div
    class="flex items-center space-x-2"
  >
    <input
      id="box"
      class="group appearance-none h-5 w-5 focus:outline-none transition duration-200 border-2 border-disco-cyan rounded-xl cursor-pointer align-top bg-contain bg-no-repeat bg-center float-left checked:bg-disco-cyan"
      type="checkbox"
      :value="_value"
      @click="clicked"
    >
    <div class="capitalize">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue'

interface Props {
  value?: string | boolean
}
const props = defineProps<Props>()

const _value = computed(() => props.value ?? false)

interface Emits {
  (e: 'clicked'): void
}
const emit = defineEmits<Emits>()

const clicked = () => { emit('clicked') }
</script>
