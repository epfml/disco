<template>
  <img :src="discoGIF">
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DiscoGIF',
  computed: {
    discoGIF (): any {
      return require('../../assets/gif/raw/disco_middle.gif')
    }
  }
})
</script>
