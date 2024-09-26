<template>
  <div
    class="flex items-center justify-between p-4 bg-white dark:bg-slate-950 rounded-md"
  >
    <div>
      <h6
        class="text-xs font-medium leading-none tracking-wider text-gray-500 dark:text-gray-300 uppercase"
      >
        {{ header }}
      </h6>
      <span class="text-xl font-semibold">
        {{ text }}
      </span>
    </div>
    <div class="ml-2">
      <span>
        <slot />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  header: string;
  text: string;
}>();
</script>
