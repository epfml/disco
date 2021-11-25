<template>
  <!-- Titanic's card-->
  <div
    v-bind:class="
      'group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker dark:bg-dark ' +
      customClass
    "
  >
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'card',
  props: {
    customClass: { default: '', type: String },
  },
};
</script>
