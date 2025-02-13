<template>
  <div
    class="p-2 text-body-secondary-light dark:text-body-secondary-dark hover:cursor-pointer"
    v-tippy="{ content: text, placement: 'right', delay: 0, animation: 0 }"
  >
    <span class="sr-only"> {{ text }} </span>

    <slot />
  </div>
</template>

<script setup lang="ts">
  defineProps<{ text: string }>();
</script>