<template>
  <svg preserveAspectRatio="xMidYMid meet" data-bbox="35.22 28.28 319.76 143.36" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" data-type="ugc" role="presentation" aria-hidden="true" aria-label="">
    <g>
        <path d="M237.97 171.64h-9.63v-74.4h-24.32V65.51h33.95v22.1h9.26l-.24-31.44h-50.44v41.07h-26.72l-.35-68.96h106.4v69.35h-9.63V37.9h-87.09l.25 49.7h7.5V46.54h69.63l.37 50.7h-18.96v74.4zm-24.32-84.03h14.69V75.13h-14.69z" fill="#fba73a"></path>
        <path class="st0" d="M247.24 107.34h7.51v47.91h12.61v6.31h-20.12z" fill-rule="nonzero"></path>
        <path class="st0" d="M280.06 141.43h9.53l-4.66-26.13h-.15zm.82-34.09h8.71l11.04 54.21h-7.51l-2.48-13.82h-11.71l-2.48 13.82h-7.5z" fill-rule="nonzero"></path>
        <path class="st0" d="M311.75 155.7h4.66c4.28 0 5.03-1.28 5.03-9.84 0-8.19-.67-9.39-4.8-9.39h-4.88v19.23zm0-25.08h4.35c4.51 0 4.96-.9 4.96-9.76 0-6.16-.98-7.66-5.78-7.66h-3.53zm-7.52-23.28h13.07c9.24 0 10.81 3.22 10.81 13.14 0 10.66-1.73 12.39-6.84 13.06v.16c6.01 1.12 7.21 3.15 7.21 12.39 0 11.71-1.5 15.47-12.46 15.47h-11.79z" fill-rule="nonzero"></path>
        <path class="st0" d="M331.1 145.86h7.53v4.43c0 3.6 1.34 5.85 4.35 5.85 3.98 0 4.96-2.7 4.96-6.24 0-4.58-.22-6.08-8.04-13.81-4.81-4.8-8.79-9.16-8.79-16.52 0-8.86 4.13-12.68 12.32-12.68 4.05 0 6.98 1.35 8.79 3 1.28 1.2 2.17 3.08 2.17 6.91v5.11h-7.07v-4.28c0-3.08-1.27-4.88-4.2-4.88-3.08 0-4.5 1.72-4.5 5.93 0 3.68.74 5.93 7.65 13.14 7.37 7.66 8.71 10.29 8.71 16.83 0 8.48-3.31 13.36-12.24 13.36-6.91 0-11.64-2.93-11.64-9.69z" fill-rule="nonzero"></path>
        <path class="st0" d="M46.34 141.43h9.53l-4.66-26.13h-.15zm.82-34.09h8.71l11.04 54.21h-7.5l-2.48-13.82H45.21l-2.48 13.82h-7.51z" fill-rule="nonzero"></path>
        <path class="st0" d="M76.51 131.67h1.96c5.93 0 6.76-1.12 6.76-9.23 0-8.04-.45-8.79-5.11-8.79h-3.61zm-7.5-24.33h11.64c10.96 0 12.09 2.93 12.09 14.79 0 7.28-.97 10.44-7.13 12.31v.15c5.1.53 6.83 3.15 6.83 8.26v11.79c0 1.95 0 4.65.45 6.91h-7.06c-.75-1.35-.9-2.7-.9-4.88v-12.24c0-5.11-.9-6.46-5.85-6.46h-2.56v23.58h-7.51z" fill-rule="nonzero"></path>
        <path class="st0" d="M104 107.35v54.21h-7.51v-54.21z"></path>
        <path class="st0" d="M116.99 141.43h9.54l-4.66-26.13h-.15zm.83-34.09h8.71l11.04 54.21h-7.51l-2.48-13.82h-11.71l-2.48 13.82h-7.51z" fill-rule="nonzero"></path>
        <path class="st0" d="M147.18 155.25h3.61c5.55 0 6.61-2.93 6.61-12.24v-18.62c0-8.03-.82-10.74-7.21-10.74h-3v41.6zm-7.51-47.91h12.09c12.16 0 13.14 4.05 13.14 19.82v16.14c0 13.89-2.48 18.25-14.34 18.25h-10.89z" fill-rule="nonzero"></path>
        <path class="st0" d="M168.73 107.34h10.36l8.86 45.06h.15v-45.06h7.06v54.22h-10.81l-8.86-46.26h-.15v46.26h-6.61z" fill-rule="nonzero"></path>
        <path class="st0" d="M199.21 107.34h20.43v6.31h-12.91v16.97h12.16v6.31h-12.16v18.32h12.91v6.31h-20.43z" fill-rule="nonzero"></path>
    </g>
</svg>
</template>

<script lang="ts" setup>
  import { useThemeStore } from "@/store";
  const themeStore = useThemeStore();
  const color = themeStore.selectByTheme("#505053", "#eee");
</script>

<style scoped>
	.st0{
    fill:v-bind('color');
  }
</style>