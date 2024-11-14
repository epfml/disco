<template>
  <label class="root">
    <span class="text-slate-600 dark:text-slate-200">
      {{ label }}
    </span>

    <slot />
  </label>
</template>

<style lang="css" scoped>
.root {
  display: flex;
  flex-direction: column;
  flex: auto;
}

.root > * {
  margin: 0.25rem 0.5rem;
}
.root > :first-child {
  margin-left: 0;
}

.root > :first-child {
  font-weight: bold;
}
</style>

<script lang="ts" setup>
defineProps<{ label: string }>();
</script>
