<template>
  <div
    class="flex flex-col items-center py-2 px-2 text-disco bg-disco font-disco rounded-full duration-200 hover:text-disco-cyan hover:scale-150 cursor-pointer"
    @click="scrollDown"
  >
    <i class="fa-solid fa-chevron-down animate-bounce" />
  </div>
</template>

<script lang="ts" setup>
import { scrollDown } from "@/utils";
</script>
