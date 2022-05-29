<template>
  <div class="flex flex-col grow h-screen overflow-y-auto">
    <main class="m-8 mb-auto">
      <slot />
    </main>
    <CustomFooter class="mt-8" />
  </div>
</template>

<script lang="ts">
import CustomFooter from '@/components/simple/CustomFooter.vue'

export default {
  name: 'BaseLayout',
  components: {
    CustomFooter
  }
}
</script>
