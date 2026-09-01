<template>
  <IconCard class="justify-self-center mx-auto w-full max-w-card">
    <template #title> Connect your data </template>
    <template #icon> <PlugIcon /> </template>

    <slot />
  </IconCard>
</template>

<script setup lang="ts">
import PlugIcon from "@/assets/svg/PlugIcon.vue";
import IconCard from "@/components/containers/IconCard.vue";
</script>
