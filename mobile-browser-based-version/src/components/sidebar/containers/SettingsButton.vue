<template>
  <button
          v-on:click="click()"
          class="
            flex
            items-center
            justify-center
            px-4
            py-2
            space-x-4
            transition-colors
            border
            rounded-md
            hover:text-gray-900 hover:border-gray-900
            dark:border-primary
            dark:hover:text-primary-100
            dark:hover:border-primary-light
            focus:outline-none
            focus:ring
            focus:ring-primary-lighter
            focus:ring-offset-2
            dark:focus:ring-offset-dark dark:focus:ring-primary-dark
          "
          :class="{
            'border-gray-900 text-gray-900 dark:border-primary-light dark:text-primary-100':
              state,
            'text-gray-500 dark:text-primary-light': !state,
          }"
        >
        <slot></slot>
  </button>
</template>

<script>
export default {
    name:'settings-button',
    props: {
        click: { default: () => {}, type: Function },
        state: { default: false, type: Boolean },
        customClass: { default: "", type: String },
  },
}
</script>

<style>

</style>