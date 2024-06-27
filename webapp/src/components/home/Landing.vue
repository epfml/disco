<template>
  <div class="flex">
    <ButtonCard
      class="mx-auto"
      @action="getStarted()"
    >
      <template #title>
        <div class="flex justify-center">
        Build collaborative AI without sharing any data
      </div>
      </template>
      <template #text>
          <p>✅ &nbsp;Data stays private and offline</p>
          <p>✅ &nbsp;Code-free and installation-free</p>
          <p>✅ &nbsp;Collaborative training via federated and decentralized learning</p>
      </template>
      <template #button>
        get started
      </template>
    </ButtonCard>
  </div>
</template>
<script lang="ts" setup>
import ButtonCard from '@/components/containers/ButtonCard.vue'

interface Emits {
  (e: 'got-started'): void
}
const emit = defineEmits<Emits>()

const getStarted = (): void => {
  emit('got-started')
}
</script>
