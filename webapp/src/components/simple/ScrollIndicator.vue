<template>
  <div
    class="flex flex-col items-center py-2 px-2 text-disco bg-disco font-disco rounded-full duration-200 hover:outline-solid hover:outline-2 hover:outline-disco-cyan dark:hover:outline-disco-light-cyan hover:text-disco-cyan dark:hover:text-disco-light-cyan"
    @click="scrollDown"
  >
    <i class="fa-solid fa-chevron-down animate-bounce" />
  </div>
</template>

<script lang="ts" setup>
import { inject, type Ref } from "vue";

// Inject scrollContainer from BaseLayout
const scrollContainer = inject<Ref<HTMLElement | null>>("scrollContainer");

function scrollDown() {
  scrollContainer?.value?.scrollBy({
    top: window.innerHeight,
    behavior: "smooth",
  });
}
</script>
