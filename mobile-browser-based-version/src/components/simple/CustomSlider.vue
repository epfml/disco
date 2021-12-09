<template>
  <label class="text-lg inline-flex items-center m-auto pb-md">
    <button
      class="relative focus:outline-none pr-md"
      v-on:click="clickFunction"
    >
      <div
        class="
          w-12
          h-6
          transition
          rounded-full
          outline-none
          bg-primary-100
          dark:bg-primary-darker
        "
      ></div>
      <div
        class="
          absolute
          top-0
          left-0
          inline-flex
          items-center
          justify-center
          w-6
          h-6
          transition-all
          duration-200
          ease-in-out
          transform
          scale-110
          rounded-full
          shadow-sm
        "
        :class="{
          'translate-x-0  bg-white dark:bg-primary-100': !activated && isClickable,
          'translate-x-6 bg-primary-light dark:bg-primary':
            activated && isClickable,
          'translate-x-0  bg-white dark:bg-primary-dark': !isClickable,
        }"
      ></div>
    </button>
    <span> {{ text }} </span>
  </label>
</template>

<script>
export default {
  name: 'custom-slider',
  props: {
    click: { default: () => {}, type: Function },
    text: { default: '', type: String },
    center: { default: false, type: Boolean },
    id: { default: 'slider', type: String },
    color: { default: 'bg-green-500', type: String },
    active: { default: false, type: Boolean },
    isClickable: { default: true, type: Boolean },
  },
  data() {
    return {
      activated: this.active,
    };
  },
  methods: {
    clickFunction() {
      if (this.isClickable) {
        this.click();
        this.activated = !this.activated;
      }
    },
  },
};
</script>
