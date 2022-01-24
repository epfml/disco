<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    :class="customClass"
    :viewBox="viewBox"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
</template>
<script>
export default {
  name: 'cross-icon',
  props: {
    customClass: {
      default: 'w-5 h-5',
      type: String,
    },
    viewBox: { default: '0 0 24 24', type: String },
  },
};
</script>
