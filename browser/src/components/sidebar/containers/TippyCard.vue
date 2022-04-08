<template>
  <div class="p-4 space-y-4 md:p-8">
    <h6 class="text-lg font-medium text-gray-400 dark:text-light">
      {{ title }}
    </h6>
    <slot />
  </div>
</template>
<script>
export default {
  name: 'TippyCard',
  props: {
    title: { default: '', type: String }
  }
}
</script>
