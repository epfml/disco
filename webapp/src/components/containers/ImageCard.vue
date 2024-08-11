<template>
  <div
    class="grid grid-cols-1 w-full bg-white aspect-square rounded-xl drop-shadow-md hover:drop-shadow-xl transition duration-500 hover:scale-105 opacity-70 hover:opacity-100 shadow hover:shadow-lg"
  >
    <div class="grid grid-cols-1 gap-1 text-center content-center p-2 h-16">
      <slot name="title" />
      <div class="text-sm">
        <slot name="subtitle" />
      </div>
    </div>

    <img class="h-full w-full object-fill rounded-b-lg" :src="imageUrl" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  imageUrl: string;
}>();
</script>
