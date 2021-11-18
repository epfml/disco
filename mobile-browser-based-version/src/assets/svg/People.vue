<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    :class="customClass"
    :viewBox="viewBox"
  >
    <path
      d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
    />
    <path
      fill-rule="evenodd"
      d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"
    />
    <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
  </svg>
</template>
<script>
export default {
  name: "people",
  props: {
    customClass: {
      default: "w-12 h-12 text-gray-300 dark:text-primary-dark",
      type: String,
    },
    viewBox: { default: "-6 -3 24 24", type: String },
  },
};
</script>
