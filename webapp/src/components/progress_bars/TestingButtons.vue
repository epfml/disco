<template>
  <div
    v-show="showPrev || showNext"
    class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8"
  >
    <div class="text-center md:text-right">
      <CustomButton
        v-show="showPrev"
        @click="setStep(validationStore.step - 1)"
      >
        previous
      </CustomButton>
    </div>
    <div class="text-center md:text-left">
      <CustomButton
        v-show="showNext"
        @click="setStep(validationStore.step + 1)"
      >
        next
      </CustomButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { useValidationStore } from "@/store";
import CustomButton from "@/components/simple/CustomButton.vue";

const validationStore = useValidationStore();

const showPrev = computed(() => validationStore.step > 0);
const showNext = computed(
  () => validationStore.step > 0 && validationStore.step < 2,
);

function setStep(index: number): void {
  switch (index) {
    case 0:
    case 1:
    case 2:
      validationStore.step = index;
      break;
    default:
      throw new Error("step out of range");
  }

  const appElement = document.getElementById("scrollable-div");
  if (appElement !== null) appElement.scrollTop = 0;
}
</script>
