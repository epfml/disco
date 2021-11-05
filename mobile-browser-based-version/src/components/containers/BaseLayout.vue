<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main v-bind:class="(override ? '' : 'flex-1 ') + customClass">
      <slot></slot>

      <!-- Main Page Footer-->
      <customFooter></customFooter>
    </main>
  </div>
</template>

<script>
import customFooter from "../Footer";
export default {
  name: "baseLayout",
  components: {customFooter},
  props: {
    customClass: { default: "", type: String },
    override: { default: false, type: Boolean },
  },
};
</script>
