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
        {{ header }}
      </h6>
      <span class="text-xl font-semibold">{{ description }}</span>
    </div>
    <div>
      <span>
        <slot />
      </span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'IconCardSmall',
  props: {
    header: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    customClass: { default: '', type: String }
  }
}
</script>
