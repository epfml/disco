<template>
  <div
    class="fixed flex flex-col items-center bottom-2 py-2 text-lg text-white bg-disco-cyan font-disco rounded-full duration-200 hover:bg-transparent dark:hover:bg-transparent hover:outline-solid hover:outline-2 hover:outline-disco-cyan dark:hover:outline-disco-light-cyan hover:text-disco-cyan dark:hover:text-disco-light-cyan"
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
