<template>
  <!-- Titanic's card-->
  <button
    v-on:click="click"
    type="button"
    class="w-1/6 text-lg border-2 border-transparent bg-green-500 my-2 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none duration-500 focus:outline-none"
  >
    <slot></slot>
  </button>
</template>

<script>
export default {
  name: "customButton",
  props: ["click"],
};
</script>
