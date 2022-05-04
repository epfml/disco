<template>
  <button
    :id="id"
    type="button"
    :class="`${
      center ? 'ml-3 py-2 px-4' : 'w-1/6'
    }
    text-lg font-bold uppercase text-white
    border-2 border-transparent
    ${color}
    my-2 rounded duration-200
    hover:bg-white hover:outline hover:outline-green-500 hover:outline-2 hover:text-green-500`"
    @click="click"
  >
    <slot />
  </button>
</template>

<script lang="ts">
export default {
  name: 'CustomButton',
  props: {
    click: { default: () => {}, type: Function },
    center: { default: false, type: Boolean },
    id: { default: 'button', type: String },
    color: { default: 'bg-green-500', type: String }
  }
}
</script>
