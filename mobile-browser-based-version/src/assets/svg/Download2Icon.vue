<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    :class="customClass"
    :viewBox="viewBox"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
</template>
<script>
export default {
  name: 'Download2Icon',
  props: {
    customClass: {
      default: 'h-9 w-5',
      type: String
    },
    viewBox: { default: '0 0 24 24', type: String }
  }
}
</script>
