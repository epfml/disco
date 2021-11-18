<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    fill="none"
    :class="customClass"
    :viewBox="viewBox"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
    />
  </svg>
</template>
<script>
export default {
  name: "model",
  props: {
    customClass: { default: "bi h-7 w-7", type: String },
    viewBox: { default: "0 0 24 24", type: String },
  },
};
</script>
