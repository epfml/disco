<template>
  <div
    class="
      flex flex-col
      p-7 gap-4
      bg-white
      rounded-lg
      transition duration-200
      group
      hover:-translate-y-1 hover:scale-[101%]
      hover:outline hover:outline-2 hover:outline-disco-cyan
      hover:cursor-pointer
    "
  >
    <div
      :class="'text-' + titlePlacement"
      class="text-xl text-disco-blue group-hover:text-disco-cyan"
    >
      <slot name="title" />
    </div>
    <div class="text-slate-500">
      <slot name="text" />
    </div>
    <div
      :class="isAltAction ? 'flex flex-wrap justify-around mt-auto items-center' : ('mt-auto text-'+buttonPlacement)"
    >
      <CustomButton
        @click="$emit('action')"
        class="mb-1"
      >
        <slot name="button" />
        <template #description>
          <slot name="description" />
        </template>
      </CustomButton>
      <CustomButton
        v-if="isAltAction"
        @click="$emit('altAction')"
        class="mb-1"
      >
        <slot name="altButton" />
        <template #description>
          <slot name="altDescription" />
        </template>
      </CustomButton>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

import CustomButton from '@/components/simple/CustomButton.vue'

export default defineComponent({
  name: 'ButtonCard',
  components: {
    CustomButton
  },
  props: {
    titlePlacement: {
      type: String,
      default: 'left'
    },
    buttonPlacement: {
      type: String,
      default: 'center'
    }
  },
  computed: {
    isAltAction () {
      return !!this.$slots.altButton
    }
  }
})
</script>
