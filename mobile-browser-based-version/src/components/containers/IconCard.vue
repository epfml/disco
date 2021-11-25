<template>
  <!--  Card -->
  <div class="grid grid-cols-1 p-4 space-y-8 lg:gap-8">
    <!-- div class="container mx-width lg h-full"></div-->
    <div class="col-span-1 bg-white rounded-lg dark:bg-darker">
      <!-- Card header -->
      <div
        class="
          flex
          items-center
          justify-between
          p-4
          border-b
          dark:border-primary
        "
      >
        <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
          {{ header }}
        </h4>
        <div class="flex items-center">
          <span aria-hidden="true">
            <slot name="icon"></slot>
          </span>
        </div>
      </div>
      <!-- Descrition -->
      <div v-if="description" class="relative p-4 overflow-x-scroll">
        <span class="text-sm text-gray-500 dark:text-light">
          <span v-html="description"></span>
        </span>
      </div>
      <!-- Extra -->
      <slot name="extra" v-if="hasExtraSlot"></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'icon-card',
  props: {
    header: { type: String },
    description: { type: String },
    customClass: { default: '', type: String },
  },
  computed: {
    hasExtraSlot() {
      return this.$slots.extra;
    },
  },
};
</script>
