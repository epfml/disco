<template>
  <a
    type="a"
    :data-title="dataTitle"
    data-placement="right"
    class="
      p-2
      text-slate-500
    "
    @click="click()"
  >
    <span class="sr-only">{{ hoverText }}</span>
    <div class="hover:cursor-pointer">
      <slot />
    </div>
  </a>
</template>

<script lang="ts">
export default {
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
}
</script>

<style></style>
