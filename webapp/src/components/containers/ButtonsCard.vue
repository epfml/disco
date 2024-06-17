<template>
  <div
    class="flex flex-col p-7 gap-4 bg-white rounded-lg transition duration-200 group hover:-translate-y-1 hover:scale-[101%] hover:outline hover:outline-2 hover:outline-disco-cyan hover:cursor-pointer"
  >
    <div
      class="text-xl text-disco-blue group-hover:text-disco-cyan"
      :class="`text-${titleAlign}`"
    >
      <slot name="title" />
    </div>

    <div class="text-slate-500">
      <slot />
    </div>

    <div
      class="flex flex-wrap mt-auto items-center"
      :class="`justify-${buttonsJustify}`"
    >
      <CustomButton
        v-for="button in buttons"
        :key="button.text"
        @click="button.action()"
        class="mb-1"
      >
        {{ button.text }}
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
    buttons: List<readonly [string, () => void]>;
    buttonsJustify?: "start" | "center" | "end";
  }>(),
  {
    titleAlign: "left",
    buttonsJustify: "center",
  },
);

const buttons = computed(() =>
  props.buttons.map(([text, action]) => ({ text, action })),
);
</script>
