<script setup lang="ts">

interface Props { event: string, hover?: string }
interface Emits { (e: string): void }

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

</script>

<template>
  <button
    class="
      flex grid-cols-3
      items-center justify-between
      px-4 py-2 space-x-4
      transition-colors duration-200
      outline outline-1 outline-slate-300
      rounded-md
      text-slate-500
      hover:text-slate-800 hover:outline-slate-800
      focus:outline-none focus:ring-1 focus:ring-slate-800
      focus:text-slate-800
    "
    :title="props.hover"
    @click="emit(props.event)"
  >
    <span><slot /></span>
  </button>
</template>
