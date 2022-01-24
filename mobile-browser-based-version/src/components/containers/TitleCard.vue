<template>
  <!-- Title's card-->
  <Card>
    <div class="ml-10 text-xl text-gray-500 dark:text-light ont-semibold">
      <span class="text-primary-dark dark:text-primary-light">
        {{ title }}
        <span class="underline" v-if="titleUnderlined">{{
          titleUnderlined
        }}</span>
      </span>
      <div class="text-base">
        <slot></slot>
      </div>
    </div>
  </Card>
</template>

<script>
import Card from './Card.vue';

export default {
  name: 'title-card',
  components: { Card },
  props: {
    title: { default: '', type: String },
    titleUnderlined: { default: '', type: String },
  },
};
</script>
