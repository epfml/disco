<template>
  <a
    type="a"
    class="
      p-2
      transition-colors
      duration-200
      rounded-full
      focus:outline-none focus:bg-primary-100
      dark:focus:bg-primary-dark
      focus:ring-primary-darker
      pointer
    "
    @click="click()"
  >
    <slot />
  </a>
</template>

<script>
export default {
  name: 'SidebarButton',
  props: {
    click: { default: () => {}, type: Function },
    customClass: { default: '', type: String }
  }
}
</script>

<style></style>
