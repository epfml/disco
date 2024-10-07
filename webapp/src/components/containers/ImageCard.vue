<template>
  <div
    class="grid grid-cols-1 w-full bg-white dark:bg-slate-800 aspect-square rounded-xl drop-shadow-md hover:drop-shadow-xl transition duration-500 hover:scale-105 opacity-70 hover:opacity-100 shadow hover:shadow-lg"
  >
    <div class="grid grid-cols-1 gap-1 text-center content-center p-2 h-16">
      <slot name="title" />
      <div class="text-sm">
        <slot name="subtitle" />
      </div>
    </div>

    <canvas class="h-full w-full object-fill rounded-b-lg" ref="canvas" />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUpdated } from "vue";

const props = defineProps<{
  image: ImageData;
}>();

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
