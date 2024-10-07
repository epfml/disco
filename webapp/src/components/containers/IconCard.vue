<template>
  <div 
    class="grid grid-cols-1 space-y-8 lg:gap-8 rounded-xl group/super"
    :class="fillSpace ? 'min-w-full lg:min-w-[42rem]': ''"
    >
    <div class="col-span-1 bg-white dark:bg-slate-950 rounded-xl">
      <IconCardHeader :title-placement="titlePlacement">
        <template #title> <slot name="title" /> </template>
        <template #icon> <slot name="icon" /> </template>
      </IconCardHeader>

      <div class="text-sm text-slate-500 dark:text-slate-200 p-8 border-t">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconCardHeader from "./IconCardHeader.vue";
withDefaults(
  defineProps<{
    titlePlacement?: "left" | "center" | "right";
    fillSpace?: boolean;
  }>(),
  {
    fillSpace: false,
  },
);
</script>
