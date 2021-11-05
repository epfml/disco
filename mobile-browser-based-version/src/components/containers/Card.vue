<template>
  <!-- Titanic's card-->
  <div
    class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker dark:bg-dark"
  >
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: "card",
};
</script>
