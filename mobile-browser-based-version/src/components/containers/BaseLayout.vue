<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main v-bind:class="`${override ? '' : 'flex-1'} ${customClass}`">
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
          <slot></slot>
        </section>
        <slot v-else></slot>
      </div>

      <!-- Main Page Footer-->
      <custom-footer></custom-footer>
    </main>
  </div>
</template>

<script>
import CustomFooter from '../simple/CustomFooter';
export default {
  name: 'base-layout',
  components: { CustomFooter },
  props: {
    customClass: { default: '', type: String },
    override: { default: false, type: Boolean },
    withSection: { default: false, type: Boolean },
  },
};
</script>
