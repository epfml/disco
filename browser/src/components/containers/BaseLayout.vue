<template>
  <div class="flex flex-col h-screen overflow-y-auto">
    <main
      class="mb-auto"
      :class="customClass"
    >
      <div>
        <section
          v-if="withSection"
          class="flex-col items-center justify-center p-4 space-y-4"
        >
          <slot />
        </section>
        <slot v-else />
      </div>
    </main>
    <CustomFooter />
  </div>
</template>

<script lang="ts">
import CustomFooter from '@/components/simple/CustomFooter.vue'

export default {
  name: 'BaseLayout',
  components: {
    CustomFooter
  },
  props: {
    customClass: { default: '', type: String },
    override: { default: false, type: Boolean },
    withSection: { default: false, type: Boolean }
  }
}
</script>
