<template>
  <!-- This SVG came from https://tablericons.com/, a website that provides open source svg -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      :class="customClass"
      :viewBox="viewBox"
      stroke-width="2" 
    >
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M6 6h3.5l2.5 -2.5l2.5 2.5h3.5v3.5l2.5 2.5l-2.5 2.5v3.5h-3.5l-2.5 2.5l-2.5 -2.5h-3.5v-3.5l-2.5 -2.5l2.5 -2.5z" />
    </svg>
  </template>
  <script lang="ts">
  export default {
    name: 'SunIcon',
    props: {
      customClass: {
        default: 'w-8 h-8',
        type: String
      },
      viewBox: { default: '0 0 24 24', type: String }
    }
  }
  </script>
  