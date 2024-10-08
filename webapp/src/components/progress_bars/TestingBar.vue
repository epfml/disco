<template>
  <div class="space-y-8 mb-8">
    <h1 class="text-disco-cyan font-disco text-3xl text-center">{{ title }}</h1>

    <div class="hidden md:flex mx-auto">
      <ProgressIcon
        class="w-1/3"
        :has-left-line="false"
        :active="true"
        :current-step="validationStore.step == 0"
        @click="handleRoute(0)"
      >
        <template #text> Choose Model </template>
        <template #icon>
          <ModelIcon custom-class="w-full w-6 w-6" view-box="-6 -6 36 36" />
        </template>
      </ProgressIcon>

      <ProgressIcon
        class="w-1/3"
        :has-left-line="true"
        :active="isActive(1)"
        :current-step="validationStore.step == 1"
        @click="handleRoute(1)"
      >
        <template #text> Connect Your Data </template>
        <template #icon>
          <PlugIcon custom-class="w-full w-5 h-5" />
        </template>
      </ProgressIcon>

      <ProgressIcon
        class="w-1/3"
        :has-left-line="true"
        :active="isActive(2)"
        :current-step="validationStore.step == 2"
        @click="handleRoute(2)"
      >
        <template #text> {{ lastStepTitle }} </template>
        <template #icon>
          <PerformanceIcon custom-class="w-full w-7 h-7" viewBox="2 -4 12 24" />
        </template>
      </ProgressIcon>
    </div>

    <TestingButtons />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useValidationStore } from "@/store";
import { useToaster } from "@/composables/toaster";
import ProgressIcon from "./ProgressIcon.vue";
import ModelIcon from "@/assets/svg/ModelIcon.vue";
import PlugIcon from "@/assets/svg/PlugIcon.vue";
import PerformanceIcon from "@/assets/svg/PerformanceIcon.vue";

import TestingButtons from "./TestingButtons.vue";

const toaster = useToaster();
const validationStore = useValidationStore();

const title = computed(() => {
  if (validationStore.step === 0 || validationStore.mode === undefined)
    return "Model Evaluation";

  switch (validationStore.mode) {
    case "predict":
      return "Model Prediction";
    case "test":
      return "Model Testing";
  }

  const _: never = validationStore.mode;
  throw new Error("should never happen");
});

const lastStepTitle = computed(() => {
  if (validationStore.step === 0 || validationStore.mode === undefined)
    return "Evaluate Your Model";

  switch (validationStore.mode) {
    case "predict":
      return "Predict With Your Model";
    case "test":
      return "Test Your Model";
  }

  const _: never = validationStore.mode;
  throw new Error("should never happen");
});

function isActive(step: number): boolean {
  return step <= validationStore.step;
}

function handleRoute(step: 0 | 1 | 2): void {
  if (validationStore.modelID === undefined) {
    toaster.error("Select a model to evaluate beforehand");
    return;
  }

  validationStore.step = step;
}
</script>
