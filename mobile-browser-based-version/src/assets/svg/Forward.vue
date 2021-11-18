<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    :class="customClass"
    :viewBox="viewBox"
  >
    <path
      d="M5.921 11.9 1.353 8.62a.719.719 0 0 1 0-1.238L5.921 4.1A.716.716 0 0 1 7 4.719V6c1.5 0 6 0 7 8-2.5-4.5-7-4-7-4v1.281c0 .56-.606.898-1.079.62z"
    />
  </svg>
</template>
<script>
export default {
  name: "forward",
  props: {
    customClass: {
      default: "w-12 h-12 text-gray-300 dark:text-primary-dark",
      type: String,
    },
    viewBox: { default: "-6 -3 20 20", type: String },
  },
};
</script>
