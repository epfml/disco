<template>
  <div
    class="grid grid-cols-1 w-full bg-white aspect-square rounded-xl drop-shadow-md hover:drop-shadow-xl transition duration-500 hover:scale-105 opacity-70 hover:opacity-100 shadow hover:shadow-lg"
  >
    <div class="grid grid-cols-1 gap-1 text-center content-center p-2 h-16">
      <slot name="title" />
      <div class="text-sm">
        <slot name="subtitle" />
      </div>
    </div>
    <img
      class="h-full w-full object-fill rounded-b-lg"
      :src="imageUrl"
    >
    <a
      v-if="actionUrl"
      class="opacity-0 hover:opacity-100 duration-500 absolute inset-0 z-10 flex justify-center items-end text-white font-semibold p-5"
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
