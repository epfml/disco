<template>
  <!-- Why use Disco? / Features -->
  <div class="flex justify-center">
    <IconCard class="justify-self-center w-full lg:w-4/5">
      <template #title> Why use Disco? </template>

      <div class="mb-4">
        <b>Supports arbitrary deep learning architectures</b><br>
        Disco supports arbitrary deep learning tasks and model architectures, running on your device via TensorFlow.js
      </div>

      <div class="mb-4">
        <b>Data and model privacy</b><br>
        Data privacy by design - no data ever leaves any device. Models updates can be protected by encryption (secure multiparty computation), and by differential privacy.
      </div>

      <div class="mb-4">
        <b>Runs anywhere</b><br>
        Disco runs in the browser, from any device equipped with a modern browser. For developers, we also offer a standalone node.js version, not needing any browser.
      </div>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import { onActivated } from 'vue'

import { useInformationStore } from "@/store";
import IconCard from '@/components/containers/IconCard.vue'

const informationStore = useInformationStore()
onActivated(() => { informationStore.step = 1 })
</script>
