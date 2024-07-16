<template>
    <div
      v-show="showPrev || showNext"
      class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8"
    >
      <div class="text-center md:text-right">
        <CustomButton
          v-show="showPrev"
          @click="prevStep"
        >
          previous
        </CustomButton>
      </div>
      <div class="text-center md:text-left">
        <CustomButton
          v-show="showNext"
          @click="nextStep"
        >
          next
        </CustomButton>
      </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useValidationStore } from '@/store/validation'
import CustomButton from '@/components/simple/CustomButton.vue'

const validationStore = useValidationStore()

const showPrev = computed<boolean>(() =>
  validationStore.step > 0)

const showNext = computed<boolean>(() =>
  validationStore.step > 0 && validationStore.step < 2)

  const scrollToTop = ():void => {
  const appElement = document.getElementById('main-page');
  if (appElement) {
    appElement.scrollTop = 0;
  }
}

const prevStep = (): void => { 
    validationStore.step-- 
    scrollToTop();
}

const nextStep = (): void => { 
    validationStore.step++ 
    scrollToTop();
}
</script>
