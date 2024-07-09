<template>
  <div class="flex flex-col grow h-screen overflow-y-auto" id="main-page">
    <main class="m-4 mb-auto md:m-8 md:mb-auto">
      <slot />
    </main>
    <div class="mt-4 md:mt-8">
      <CustomFooter />
    </div>
  </div>
</template>

<script lang="ts" setup>
import CustomFooter from '@/components/simple/CustomFooter.vue'
</script>
