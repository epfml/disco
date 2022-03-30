<template>
  <div
    :class="
      'group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-dark dark:bg-darker' +
        customClass
    "
  >
    <slot />
  </div>
</template>

<script>
export default {
  name: 'CardItem',
  props: {
    customClass: { default: '', type: String }
  }
}
</script>
