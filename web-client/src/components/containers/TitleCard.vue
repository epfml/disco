<template>
  <!-- Title's card-->
  <Card>
    <div class="group m-6 text-xl text-slate-500">
      <span class="text-disco-blue group-hover:text-disco-cyan">
        <slot name="title" />
      </span>
      <div class="text-base">
        <slot name="text" />
      </div>
    </div>
  </Card>
</template>

<script lang="ts">
import Card from './Card.vue'

export default {
  name: 'TitleCard',
  components: { Card }
}
</script>
