<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    :class="customClass"
    :viewBox="viewBox"
    stroke-width="2" 
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
</template>
<script lang="ts">
export default {
  name: 'MoonIcon',
  props: {
    customClass: {
      default: 'bi bi-info-circle w-7 h-7',
      type: String
    },
    viewBox: { default: '0 0 24 24', type: String }
  }
}
</script>
