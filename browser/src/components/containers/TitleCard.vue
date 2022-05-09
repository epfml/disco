<template>
  <!-- Title's card-->
  <Card>
    <div class="group m-6 text-xl text-slate-500">
      <span class="text-disco-blue group-hover:text-disco-cyan">
        {{ title }}
        <span
          v-if="titleUnderlined"
          class="underline"
        >{{
          titleUnderlined
        }}</span>
      </span>
      <div class="text-base">
        <slot />
      </div>
    </div>
  </Card>
</template>

<script lang="ts">
import Card from './Card.vue'

export default {
  name: 'TitleCard',
  components: { Card },
  props: {
    title: { default: '', type: String },
    titleUnderlined: { default: '', type: String }
  }
}
</script>
