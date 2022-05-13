<template>
  <a
    type="a"
    :data-title="firstLetterUppercase(hoverText)"
    data-placement="right"
    class="
      p-2
      duration-200
      rounded-full
      text-white
      bg-disco-blue
      outline-none
      hover:outline
      hover:outline-2
      hover:outline-disco-blue
      hover:text-disco-blue
      hover:bg-white
      hover:cursor-pointer
    "
    @click="click()"
  >
    <span class="sr-only">{{ hoverText }}</span>
    <slot />
  </a>
</template>

<script lang="ts">
export default {
  name: 'SidebarButton',
  props: {
    click: { default: () => {}, type: Function },
    hoverText: { default: '', type: String },
    customClass: { default: '', type: String }
  },
  methods: {
    firstLetterUppercase: (str: string) => {
      return !str || str.charAt(0).toUpperCase() + str.slice(1)
    }
  }
}
</script>

<style></style>
