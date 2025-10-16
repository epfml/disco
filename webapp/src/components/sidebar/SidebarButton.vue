<template>
  <div
    v-tippy="{ content: text, placement: 'right', delay: 0, animation: 0 }"
    class="flex flex-col justify-center items-center gap-y-2
    text-body-secondary-light dark:text-body-secondary-dark hover:cursor-pointer"
  >
    <slot />
    <span class="text-xs">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
  defineProps<{ text: string, label:string }>();
</script>
