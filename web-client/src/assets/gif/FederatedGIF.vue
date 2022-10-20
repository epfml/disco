<template>
  <img :src="federatedGIF">
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'FederatedGIF',
  computed: {
    federatedGIF (): any {
      return require('../../assets/gif/raw/federated_render.gif')
    }
  }
})
</script>
