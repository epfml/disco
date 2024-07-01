<template>
  <div
    :class="
      'group flex-col items-center justify-between p-1 bg-white rounded-md ' +
        customClass
    "
  >
    <slot />
  </div>
</template>

<script lang="ts">
export default {
  name: 'CardItem',
  props: {
    customClass: { default: '', type: String }
  }
}
</script>
