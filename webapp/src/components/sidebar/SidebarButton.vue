<template>
  <div class="p-2 text-slate-500 dark:text-slate-200">
    <span class="sr-only"> {{ text }} </span>
    <RouterLink
      :to="to"
      v-tippy="{ content: text, placement: 'right', delay: 0, animation: 0 }"
      class="hover:cursor-pointer"
    >
      <slot />
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  to: string;
  text: string;
}>();
</script>
