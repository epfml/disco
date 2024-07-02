<template>
  <div
    class="p-1 rounded-md"
    :class="customClass"
  >
    <slot />
  </div>
</template>

<script lang="ts">
export default {
  name: 'CardItem',
  props: {
    customClass: { default: 'bg-white', type: String }
  }
}
</script>
