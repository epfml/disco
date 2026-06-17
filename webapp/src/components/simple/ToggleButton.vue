<template>
  <a
    class="px-4 py-2 font-bold text-lg uppercase rounded-md hover:cursor-pointer"
    :class="
      toggled
        ? 'bg-white text-disco-cyan outline-solid outline-2 outline-disco-cyan hover:outline-hidden hover:bg-disco-cyan hover:text-white'
        : 'bg-disco-cyan text-white hover:text-disco-cyan hover:bg-white hover:outline-solid hover:outline-2 hover:outline-disco-cyan'
    "
    @click="toggle"
  >
    <slot />
  </a>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "ToggleButton",
  data(): { toggled: boolean } {
    return {
      toggled: false,
    };
  },
  methods: {
    toggle() {
      this.toggled = !this.toggled;
    },
  },
});
</script>
