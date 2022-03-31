<template>
  <!-- Title's card-->
  <Card>
    <div class="ml-10 text-xl text-gray-500 dark:text-light">
      <span class="text-primary-dark dark:text-primary-light">
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

<script>
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
