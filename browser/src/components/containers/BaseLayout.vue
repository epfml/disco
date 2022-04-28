<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main :class="`${override ? '' : 'flex-1'} ${customClass}`">
      <div
        class="
          flex flex-col
          pt-4
          items-right
          justify-start
          flex-1
          h-full
          min-h-screen
          overflow-y-auto
        "
      >
        <section
          v-if="withSection"
          class="flex-col items-center justify-center p-4 space-y-4"
        >
          <slot />
        </section>
        <slot v-else />
      </div>

      <!-- Main Page Footer-->
      <custom-footer />
    </main>
  </div>
</template>

<script>
import CustomFooter from '../simple/CustomFooter.vue'

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
