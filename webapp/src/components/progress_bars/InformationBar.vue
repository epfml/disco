<template>
  <div class="mb-4 space-y-4">
    <div class="flex flex-wrap text-3xl text-slate-600 dark:text-slate-100 justify-center">
      <DISCO />
    </div>
    <div class="hidden md:inline-block w-full">
      <div class="flex">
        <ProgressIcon
          class="w-1/4"
          :active="isActive(0)"
          :current-step="informationStore.step == 0"
          :has-left-line="false"
          @click="router.push('/information')"
        >
          <template #text>
            Fundamentals
          </template>
          <template #icon>
            <div>
              <span class="font-disco">1.</span>
            </div>
          </template>
        </ProgressIcon>
        <ProgressIcon
          class="w-1/4"
          :active="isActive(1)"
          :current-step="informationStore.step == 1"
          :has-left-line="true"
          @click="router.push('/features')"
        >
          <template #text>
            Features
          </template>
          <template #icon>
            <div>
              <span class="font-disco">2.</span>
            </div>
          </template>
        </ProgressIcon>
        <ProgressIcon
          class="w-1/4"
          :active="isActive(2)"
          :current-step="informationStore.step == 2"
          :has-left-line="true"
          @click="router.push('/tutorial')"
        >
          <template #text>
            Tutorial
          </template>
          <template #icon>
            <div>
              <span class="font-disco">3.</span>
            </div>
          </template>
        </ProgressIcon>
        <ProgressIcon
          class="w-1/4"
          :active="isActive(3)"
          :current-step="informationStore.step == 3"
          :has-left-line="true"
          @click="router.push('/further')"
        >
          <template #text>
            Further
          </template>
          <template #icon>
            <div>
              <span class="font-disco">4.</span>
            </div>
          </template>
        </ProgressIcon>
      </div>
    </div>

    <div class="flex flex-row justify-center gap-4 py-6">
      <div
        class="text-center md:text-right"
      >
        <CustomButton
          v-show="isActive(1)"
          @click="prevStep"
        >
          previous
        </CustomButton>
      </div>
      <div
        class="text-center md:text-left"
      >
        <CustomButton
          v-show="!isActive(3)"
          @click="nextStep"
        >
          next
        </CustomButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useInformationStore } from '@/store/information'
import ProgressIcon from './ProgressIcon.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import DISCO from '@/components/simple/DISCO.vue'

const router = useRouter()
const informationStore = useInformationStore()

const routes = ['information', 'features', 'tutorial', 'further']
  .map((route) => '/' + route)
const toRoute = computed(() => routes[informationStore.step])

const isActive = (step: number) => step <= informationStore.step
const prevStep = () => {
  informationStore.prevStep()
  router.push(toRoute.value)
}
const nextStep = () => {
  informationStore.nextStep()
  router.push(toRoute.value)
}
</script>
