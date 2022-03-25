<template>
  <a
    type="a"
    @click="click()"
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
    :class="[
      this.activePage === this.hoverText ? 'bg-primary' : 'bg-white',
      this.activePage === this.hoverText
        ? 'text-primary-50'
        : 'text-primary',
    ]"
  >
    <slot></slot>
  </a>
</template>

<script>
export default {
  name: 'sidebar-button',
  props: {
    click: { default: () => {}, type: Function },
    hoverText: { default: '', type: String },
    activePage: { default: 'home', type: String },
    customClass: { default: '', type: String }
  },
  methods: {
  }
}
</script>

<style></style>
