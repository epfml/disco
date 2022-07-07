<template>
  <div>
    <!-- Disco logo -->
    <DiscoGIF class="mx-auto mb-[10%]" />

    <GetStarted v-if="gotStarted" />
    <Landing
      v-else
      @got-started="getStarted"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

import DiscoGIF from '@/assets/gif/DiscoGIF.vue'
import Landing from '@/components/home/Landing.vue'
import GetStarted from '@/components/home/GetStarted.vue'

export default defineComponent({
  name: 'Home',
  components: {
    DiscoGIF,
    Landing,
    GetStarted
  },
  data () {
    return {
      gotStarted: false
    }
  },
  methods: {
    getStarted (): void {
      this.gotStarted = true
    }
  }
})
</script>
