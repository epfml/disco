<template>
  <div
    v-show="showPrev || showNext"
    class="mx-auto flex gap-4 lg:gap-8 mt-8 lg:mt-12 justify-center"
  >
    <CustomButton
      v-show="showPrev"
      @click="setStep(validationStore.step - 1)"
    >
      previous
    </CustomButton>
    <CustomButton
      v-show="showNext"
      @click="setStep(validationStore.step + 1)"
    >
      next
    </CustomButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { scrollToTop } from "@/utils";
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

  scrollToTop();
}
</script>
