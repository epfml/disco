<template>
    <div
        v-show="route.fullPath !== '/list'"
        class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-8 md:mt-12"
      >
        <div class="text-center md:text-right">
          <CustomButton
            v-show="trainingStore.step !== undefined && trainingStore.step >= 1"
            @click="prevStepOrList"
          >
            previous
          </CustomButton>
        </div>
        <div class="text-center md:text-left">
          <CustomButton
            v-show="trainingStore.step !== undefined && trainingStore.step <= 3"
            @click="nextStep"
          >
            next
          </CustomButton>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'


import { useTrainingStore } from "@/store";
import CustomButton from '@/components/simple/CustomButton.vue'

const router = useRouter()
const trainingStore = useTrainingStore()
const route = useRoute()

const scrollToTop = ():void => {
  const appElement = document.getElementById('scrollable-div');
  if (appElement) {
    appElement.scrollTop = 0;
  }
}

const prevStepOrList = async (): Promise<void> => {
    if (trainingStore.step === 1) {
        await router.push({ path: '/list' });
        nextTick(() => {
            scrollToTop();
        });
    } else {
        trainingStore.prevStep();
        nextTick(() => {
            scrollToTop();
        });
    }
}

const nextStep = (): void => {
    trainingStore.nextStep();
    nextTick(() => {
        scrollToTop();
    });
}
</script>