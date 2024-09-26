<template>
      <div class="flex items-center justify-between p-4 md:p-6">
        <h4
          class="flex w-full text-xl text-disco-blue dark:text-disco-light-blue group-hover/super:text-disco-cyan"
          :class="`justify-${titlePlacement} text-${titlePlacement}`"
        >
          <slot name="title" />
        </h4>

        <div class="flex items-center"><slot name="icon" /></div>
      </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    titlePlacement?: "left" | "center" | "right";
  }>(),
  {
    titlePlacement: "left",
  },
);
</script>
