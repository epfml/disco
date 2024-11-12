<template>
  <div class="grid grid-cols-1 space-y-8 lg:gap-8 rounded-xl group/super">
    <div class="col-span-1 bg-white dark:bg-slate-950 rounded-xl">
      <IconCardHeader>
        <template #title>
          <button class="focus:outline-none" @click="toggle">
            <slot name="title" />
          </button>
        </template>

        <template #icon>
          <button class="focus:outline-none" @click="toggle">
            <UpArrow v-show="opened" />
            <DownArrow v-show="!opened" />
          </button>
        </template>
      </IconCardHeader>

      <div
        v-show="opened"
        class="text-sm text-slate-500 dark:text-slate-300 p-8 border-t"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

import UpArrow from "@/assets/svg/UpArrow.vue";
import DownArrow from "@/assets/svg/DownArrow.vue";

import IconCardHeader from "./IconCardHeader.vue";

const props = withDefaults(
  defineProps<{
    initiallyOpen?: boolean;
  }>(),
  { initiallyOpen: true },
);

const opened = ref(true);

watch(props, ({ initiallyOpen }) => {
  opened.value = initiallyOpen;
});

function toggle() {
  opened.value = !opened.value;
}
</script>
