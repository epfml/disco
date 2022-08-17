<template>
  <div>
    <!-- Disco logo -->
    <div class="flex flex-col justify-center mb-[8%] space-y-10">
      <DiscoGIF class="mx-auto" />
      <span class="text-4xl text-center text-slate-600">
        <span class="text-disco-blue font-disco font-semibold">[DIS]</span>tributed
        <span class="text-disco-cyan font-disco font-semibold">[CO]</span>llaborative Learning
      </span>
    </div>
    <GetStarted v-if="gotStarted" />
    <Landing
      v-else
      @got-started="getStarted"
    />
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue'

import DiscoGIF from '@/assets/gif/DiscoGIF.vue'
import Landing from '@/components/home/Landing.vue'
import GetStarted from '@/components/home/GetStarted.vue'

const gotStarted = ref(false)
const getStarted = (): void => {
  gotStarted.value = true
}
</script>
