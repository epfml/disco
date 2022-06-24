<template>
  <img :src="decentralizedGIF">
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DecentralizedGIF',
  computed: {
    decentralizedGIF (): any {
      return require('../../assets/gif/raw/decentralized_render.gif')
    }
  }
})
</script>
