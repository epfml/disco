<template>
    <div
        v-show="route.fullPath !== '/list'"
        class="mx-auto flex gap-4 lg:gap-8 mt-8 lg:mt-12 justify-center"
      >
        <CustomButton
          v-if="!isLoading"
          v-show="trainingStore.step !== undefined && trainingStore.step >= 1"
          @click="prevStepOrList"
        >
          previous
        </CustomButton>
        <CustomButton
          v-if="!isLoading"
          v-show="trainingStore.step !== undefined && trainingStore.step <= 3"
          @click="nextStep"
        >
          next
        </CustomButton>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'

import { scrollToTop } from "@/utils";
import { useTrainingStore, useTasksStore } from "@/store";
import CustomButton from '@/components/simple/CustomButton.vue'

const router = useRouter()
const trainingStore = useTrainingStore()
const route = useRoute()
const { tasks } = storeToRefs(useTasksStore())

const isLoading = computed<boolean>(() => {
  return typeof tasks.value === "string";
});


async function prevStepOrList(): Promise<void> {
  if (trainingStore.step === 1) {
    await router.push({ path: '/list' });
    trainingStore.prevStep();
  } else {
    trainingStore.prevStep();
    scrollToTop(); // scroll manually
  }
}

function nextStep() {
    trainingStore.nextStep();
    scrollToTop();
}
</script>
