<template>
  <!--  Card -->
  <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
    <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
      <!-- Card header -->
      <div
        class="flex items-center justify-between p-4 border-b dark:border-primary"
      >
        <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
          {{ header }}
        </h4>
        <div class="flex items-center">
          <span aria-hidden="true">
            <img :src="`../../assets/svg/${icon}.svg`" />
          </span>
        </div>
      </div>
      <!-- Descrition -->
      <div class="relative p-4 overflow-x-scroll">
        <span class="text-sm text-gray-500 dark:text-light">
          {{ description }}
        </span>
      </div>
      <!-- Extra -->
      <slot name="extra" v-if="hasExtraSlot"></slot>
    </div>
  </div>
</template>

<script>
import InlineSvg from "vue-inline-svg";
export default {
  name: "icon-card",
  props: {
    header: { type: String },
    description: { type: String },
    icon: { type: String },
    customClass: { default: "", type: String },
  },
  component: { InlineSvg },
  computed: {
    hasExtraSlot() {
      return this.$slots.extra;
    },
  },
};
</script>
