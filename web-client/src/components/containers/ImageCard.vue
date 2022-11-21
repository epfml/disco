<template>
  <div
    class="grid grid-cols-1 w-full bg-white aspect-square rounded-xl drop-shadow-md hover:drop-shadow-xl transition duration-500 hover:scale-105 opacity-70 hover:opacity-100 shadow hover:shadow-lg"
  >
    <p class="text-center text-disco-blue p-2">
      <slot name="title" />
    </p>
    <img
      class="h-full w-full object-fill rounded-b-lg"
      :src="imageUrl"
    >
    <a
      class="opacity-0 hover:opacity-100 duration-500 absolute inset-0 z-10 flex justify-end items-end text-white font-semibold p-5"
      :href="actionUrl"
      target="_blank"
    >
      <CustomButton
        class="text-xs"
      >
        Click to show on Google Map
      </CustomButton>
    </a>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import CustomButton from '@/components/simple/CustomButton.vue'

export default defineComponent({
  name: 'ImageCard',
  components: {
    CustomButton
  },
  props: {
    imageUrl: { default: '', type: String },
    actionUrl: { default: '', type: String }
  }
})
</script>
