<template>
  <!-- Titanic's card-->
  <button
    v-on:click="click"
    type="button"
    :class="`${
      center ? 'ml-3 py-2 px-4' : 'w-1/6'
    } text-lg border-2 border-transparent ${color} my-2 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none duration-500 hover:scale-110 focus:outline-none`"
    :id="id"
  >
    <slot></slot>
  </button>
</template>

<script>
export default {
  name: 'custom-button',
  props: {
    click: { default: () => {}, type: Function },
    center: { default: false, type: Boolean },
    id: { default: 'button', type: String },
    color: { default: 'bg-green-500', type: String },
  },
};
</script>
