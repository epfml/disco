<template>
  <!-- Nbr. of Weight Requests -->
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
        <slot></slot>
      </span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'icon-card-small',
  props: {
    header: { type: String },
    description: { type: String },
    customClass: { default: '', type: String },
  },
};
</script>
