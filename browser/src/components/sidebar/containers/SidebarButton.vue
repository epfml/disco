<template>
  <div
    class="
      p-2
      text-slate-500
    "
  >
    <span class="sr-only">{{ hoverText }}</span>
    <a
      type="a"
      :data-title="dataTitle"
      data-placement="right"
      class="hover:cursor-pointer"
      @click="click()"
    >
      <slot />
    </a>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'SidebarButton',
  props: {
    click: { default: () => {}, type: Function },
    hoverText: { default: '', type: String },
    customClass: { default: '', type: String }
  },
  computed: {
    dataTitle (): string {
      return this.hoverText.charAt(0).toUpperCase() + this.hoverText.slice(1)
    }
  }
})
</script>
