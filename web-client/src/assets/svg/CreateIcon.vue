<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    :class="customClass"
    :viewBox="viewBox"
    stroke="currentColor"
  >
      <path d="M20.71,3.29a2.91,2.91,0,0,0-2.2-.84,3.25,3.25,0,0,0-2.17,1L9.46,10.29s0,0,0,0a.62.62,0,0,0-.11.17,1,1,0,0,0-.1.18l0,0L8,14.72A1,1,0,0,0,9,16a.9.9,0,0,0,.28,0l4-1.17,0,0,.18-.1a.62.62,0,0,0,.17-.11l0,0,6.87-6.88a3.25,3.25,0,0,0,1-2.17A2.91,2.91,0,0,0,20.71,3.29Z"></path>
      <path d="M20,22H4a2,2,0,0,1-2-2V4A2,2,0,0,1,4,2h8a1,1,0,0,1,0,2H4V20H20V12a1,1,0,0,1,2,0v8A2,2,0,0,1,20,22Z"></path>
  </svg>
</template>
<script lang="ts">
export default {
  name: 'CreateIcon',
  props: {
    customClass: {
      default: 'w-6 h-6',
      type: String
    },
    viewBox: { default: '0 0 24 24', type: String }
  }
}
</script>
