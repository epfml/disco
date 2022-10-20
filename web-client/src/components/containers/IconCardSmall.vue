<template>
  <div
    class="
      flex
      items-center
      justify-between
      p-4
      bg-white
      rounded-md
      dark:bg-darker
    "
  >
    <div>
      <h6
        class="
          text-xs
          font-medium
          leading-none
          tracking-wider
          text-gray-500
          uppercase
          dark:text-primary-light
        "
      >
        <slot name="header" />
      </h6>
      <span class="text-xl font-semibold">
        <slot name="text" />
      </span>
    </div>
    <div>
      <span>
        <slot name="icon" />
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'IconCardSmall',
  props: {
    customClass: { default: '', type: String }
  }
})
</script>
