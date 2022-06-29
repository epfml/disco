<template>
  <button
    :id="id"
    type="button"
    class="
    px-4 py-1 min-w-[8rem]
    text-lg font-bold uppercase text-white
    bg-disco-cyan
    rounded duration-200
    hover:bg-white hover:outline hover:outline-disco-cyan hover:outline-2 hover:text-disco-cyan"
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
    id: { default: 'button', type: String }
  }
}
</script>
