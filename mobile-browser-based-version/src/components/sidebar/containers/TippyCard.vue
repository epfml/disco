<template>
  <div class="p-4 space-y-4 md:p-8">
    <h6 class="text-lg font-medium text-gray-400 dark:text-light">
      {{ this.title }}
    </h6>
    <slot></slot>
  </div>
</template>
<script>
export default {
  name: 'tippy-card',
  props: {
    title: { default: '', type: String },
  },
};
</script>
