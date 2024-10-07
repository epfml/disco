<template>
  <div
    class="flex flex-col p-7 gap-4 bg-white dark:bg-slate-950 rounded-lg transition duration-200 group hover:-translate-y-1 hover:scale-[101%] hover:outline hover:outline-2 hover:outline-disco-cyan dark:hover:outline-disco-dark-cyan hover:cursor-pointer"
  >
    <div class="flex flex-row">
      <div
        class="grow text-xl text-disco-blue dark:text-slate-300 group-hover:text-disco-cyan dark:group-hover:text-disco-light-cyan"
        :class="`text-${titleAlign}`"
      >
        <slot name="title" />
      </div>

      <div><slot name="icon" /></div>
    </div>

    <div class="text-slate-500 dark:text-slate-300">
      <slot />
    </div>

    <div
      class="flex flex-wrap mt-auto items-center gap-x-4"
      :class="`justify-${buttonsJustify}`"
    >
      <CustomButton
        v-for="button in buttons"
        :key="button.text"
        @click="button.action()"
        class="mb-1"
      >
        {{ button.text }}
        <template #description>
          {{ button.description }}
        </template>
      </CustomButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { List } from "immutable";

import CustomButton from "@/components/simple/CustomButton.vue";

const props = withDefaults(
  defineProps<{
    titleAlign?: "left" | "center" | "right";
    buttons: List<readonly [string, () => void, string?]>; // button text, on click function, optional description
    buttonsJustify?: "start" | "center" | "end";
  }>(),
  {
    titleAlign: "left",
    buttonsJustify: "center",
  },
);

const buttons = computed(() =>
  props.buttons.map(([text, action, description]) => ({
    text,
    action,
    description,
  })),
);
</script>
