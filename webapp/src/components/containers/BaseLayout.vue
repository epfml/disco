<template>
  <div id="scrollable-div" class="flex flex-col h-full w-full overflow-y-auto">
    <main class="m-4 md:m-8 grow">
      <slot />
    </main>
    <CustomFooter />
  </div>
</template>

<script lang="ts" setup>
import CustomFooter from '@/components/simple/CustomFooter.vue'
</script>
