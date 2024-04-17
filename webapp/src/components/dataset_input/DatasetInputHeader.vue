<template>
  <div class="grid grid-cols-1">
    <IconCard class="justify-self-center w-full">
      <template #title> Connect your data </template>
      <template #icon>
        <PlugIcon />
      </template>
      <template #content>
        <div class="mb-5 text-left">
          Disco needs to know where your data is located on your device in order
          to read it (<b>not</b> upload it!) and train models. Models are
          trained on your local data and are periodically aggregated with other
          users' models if any. <br /><br /><b
            >Your data stays on your device and data is never uploaded
            anywhere.</b
          >
        </div>

        <slot />
      </template>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import PlugIcon from "@/assets/svg/PlugIcon.vue";
import IconCard from "@/components/containers/IconCard.vue";
</script>
