<template>
  <div class="flex">
    <ButtonCard
      :click="getStarted"
      class="mx-auto"
    >
      <template #title>
        Build AI with collaborators <span class="underline">without sharing any data</span>
      </template>
      <template #text>
        <p>- Exchange <span class="italic">models</span> not data</p>
        <p>- Keep data at its source</p>
        <p>- Choose either <span class="italic">decentralized</span> or <span class="italic">federated</span> training</p>
      </template>
      <template #button>
        Get Started
      </template>
    </ButtonCard>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

import ButtonCard from '@/components/containers/ButtonCard.vue'

export default defineComponent({
  name: 'Landing',
  components: {
    ButtonCard
  },
  methods: {
    getStarted (): void {
      this.$emit('got-started')
    }
  }
})
</script>
