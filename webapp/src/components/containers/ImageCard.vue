<template>
  <div
    class="grid grid-cols-1 w-full bg-white aspect-square rounded-xl drop-shadow-md hover:drop-shadow-xl transition duration-500 hover:scale-105 opacity-70 hover:opacity-100 shadow hover:shadow-lg"
    :class="{ 'cursor-pointer': showButton }"
  >
    <div class="grid grid-cols-1 gap-1 text-center content-center p-2 h-16">
      <slot name="title" />
      <div class="text-sm">
        <slot name="subtitle" />
      </div>
    </div>
    <canvas class="h-full w-full object-fill rounded-b-lg" ref="canvas">
      image
    </canvas>
    <div
      v-if="showButton"
      class="opacity-0 hover:opacity-100 duration-500 absolute inset-0 z-10 flex justify-center items-end text-white font-semibold p-5"
    >
      <CustomButton class="text-xs"> click to show on maps </CustomButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUpdated } from "vue";

import CustomButton from "@/components/simple/CustomButton.vue";

const props = withDefaults(
  defineProps<{
    image: ImageData;
    showButton: boolean;
  }>(),
  { showButton: false },
);

const canvas = ref<HTMLCanvasElement | null>(null);

onMounted(draw);
onUpdated(draw);

function draw() {
  const element = canvas.value;
  if (element === null) throw new Error("canvas element doesn't exists");
  element.width = props.image.width;
  element.height = props.image.height;

  const context = element.getContext("2d");
  if (context === null) throw new Error("canvas doesn't support 2D context");
  context.putImageData(props.image, 0, 0);
}
</script>
