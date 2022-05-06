<template>
  <a
    type="a"
    :data-title="firstLetterUppercase(hoverText)"
    data-placement="right"
    class="
      p-2
      duration-200
      rounded-full
      hover:outline
      hover:outline-2
      hover:outline-disco-blue
      hover:text-disco-blue
      hover:bg-white
      text-white
      bg-disco-blue
      outline-none
    "
    @click="click()"
  >
    <span class="sr-only">{{ hoverText }}</span>
    <slot />
  </a>
</template>

<script>
export default {
  name: 'SidebarButton',
  props: {
    click: { default: () => {}, type: Function },
    hoverText: { default: '', type: String },
    customClass: { default: '', type: String }
  },
  methods: {
    firstLetterUppercase: (str) => {
      return !str || str.charAt(0).toUpperCase() + str.slice(1)
    }
  }
}
</script>

<style></style>
