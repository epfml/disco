<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main v-bind:class="(override ? '' : 'flex-1 ') + customClass">
      <div
        class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen overflow-y-auto"
      >
        <slot></slot>
      </div>

      <!-- Main Page Footer-->
      <customFooter></customFooter>
    </main>
  </div>
</template>

<script>
import customFooter from "../simple/CustomFooter";
export default {
  name: "baseLayout",
  components: { customFooter },
  props: {
    customClass: { default: "", type: String },
    override: { default: false, type: Boolean },
  },
};
</script>
