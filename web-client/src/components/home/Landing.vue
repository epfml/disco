<template>
  <div class="flex">
    <ButtonCard
      class="mx-auto"
      @action="getStarted()"
    >
      <template #title>
        Build AI with collaborators <span class="underline">without sharing any data</span>
      </template>
      <template #text>
        <p>- Exchange <span class="italic">model</span> updates not data</p>
        <p>- Keep data at its source</p>
        <p>- Supports both <span class="italic">decentralized</span> and <span class="italic">federated</span> training</p>
      </template>
      <template #button>
        Get Started
      </template>
    </ButtonCard>
  </div>
</template>
<script lang="ts" setup>
import { defineEmits } from 'vue'

import ButtonCard from '@/components/containers/ButtonCard.vue'

interface Emits {
  (e: 'got-started'): void
}
const emit = defineEmits<Emits>()

const getStarted = (): void => {
  emit('got-started')
}
</script>
