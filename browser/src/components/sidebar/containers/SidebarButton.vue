<template>
  <a
    type="a"
    :data-title="firstLetterUppercase(hoverText)"
    data-placement="right"
    class="
      p-2
      transition-colors
      duration-200
      rounded-full
      hover:text-primary hover:bg-primary-100
      dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark
      focus:outline-none focus:bg-primary-100
      dark:focus:bg-primary-dark
      focus:ring-primary-darker
    "
    :class="[
      activePage === hoverText ? 'bg-primary' : 'bg-primary-50',
      activePage === hoverText
        ? 'text-white'
        : 'text-primary-lighter',
    ]"
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
    activePage: { default: 'home', type: String },
    customClass: { default: '', type: String }
  },
  methods: {
    firstLetterUppercase: function (str) {
      return !str || str.charAt(0).toUpperCase() + str.slice(1)
    }
  }
}
</script>

<style></style>
