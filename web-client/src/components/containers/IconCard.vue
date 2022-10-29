<script setup lang="ts">

import { defineProps } from 'vue'

const props = defineProps({
  withContent: {
    type: Boolean,
    default: true
  }
})

</script>

<template>
  <!--  Card -->
  <div class="grid grid-cols-1 space-y-8 lg:gap-8">
    <!-- div class="container mx-width lg h-full"></div-->
    <div class="col-span-1 bg-white rounded-lg">
      <!-- Card header -->
      <div
        class="
          flex
          items-center
          justify-between
          p-4
        "
      >
        <h4 class="text-lg font-semibold text-disco-cyan">
          <slot name="title" />
        </h4>
        <div class="flex items-center">
          <span aria-hidden="true">
            <slot name="icon" />
          </span>
        </div>
      </div>
      <!-- Description -->
      <div
        v-show="props.withContent"
        class="text-sm text-slate-500 p-8 border-t"
      >
        <slot name="content" />
      </div>
    </div>
  </div>
</template>
