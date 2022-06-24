<template>
  <img :src="discoGIF">
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DiscoGIF',
  computed: {
    discoGIF (): any {
      return require('../../assets/gif/raw/discoWelcome500.gif')
    }
  }
})
</script>
