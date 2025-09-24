<template>
  <div
    class="flex flex-col p-7 gap-4 bg-white dark:bg-slate-950 rounded-lg 
    hover:outline-solid hover:outline-1 hover:outline-disco-cyan hover:cursor-pointer"
  >
    <div class="flex flex-row">
      <div
        class="grow text-xl text-heading-light dark:text-heading-dark"
        :class="`text-${titleAlign}`"
      >
        <slot name="title" />
      </div>

      <slot name="icon" />
    </div>

    <div><slot /></div>
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
