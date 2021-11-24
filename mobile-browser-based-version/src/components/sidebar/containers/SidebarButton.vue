<template>
  <a
        type="a"
        :data-title="hoverText"
        data-placement="right"
        v-on:click="click"
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

          text-primary-lighter
          bg-primary-50
          
        "
        :class="[
          this.activePage === 'info' ? 'bg-primary' : 'bg-primary-50',
          this.activePage === 'info' ? 'text-white' : 'text-primary-lighter',
        ]"
      >
        <span class="sr-only">{{this.hoverText}}</span>
        <slot></slot>
      </a>
</template>

<script>
export default {
    'name': 'sidebar-button',
    props: {
        click: { default: () => {}, type: Function },
        hoverText: { default: '', type: String },
        customClass: { default: '', type: String },
  },
}
</script>

<style>

</style>


