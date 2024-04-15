<template>
  <div class="space-y-4 md:space-y-8 my-8 md:my-16">
    <div class="hidden md:inline-block w-full">
      <div class="flex">
        <ProgressIcon
          class="w-1/4"
          :active="isActive(0)"
          :lined="false"
          @click="router.push('/information')"
        >
          <template #text>
            Fundamentals
          </template>
          <template #icon>
            <svg
              class="w-full fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                class="heroicon-ui"
                d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2zm14 8V5H5v6h14zm0 2H5v6h14v-6zM8 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"
              />
            </svg>
          </template>
        </ProgressIcon>
        <ProgressIcon
          class="w-1/4"
          :active="isActive(1)"
          :lined="true"
          @click="router.push('/features')"
        >
          <template #text>
            Features
          </template>
          <template #icon>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-full fill-current"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              width="24"
              height="24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </template>
        </ProgressIcon>
        <ProgressIcon
          class="w-1/4"
          :active="isActive(2)"
          :lined="true"
          @click="router.push('/tutorial')"
        >
          <template #text>
            Tutorial
          </template>
          <template #icon>
            <svg
              class="w-full fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                class="heroicon-ui"
                d="M9 4.58V4c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v.58a8 8 0 0 1 1.92 1.11l.5-.29a2 2 0 0 1 2.74.73l1 1.74a2 2 0 0 1-.73 2.73l-.5.29a8.06 8.06 0 0 1 0 2.22l.5.3a2 2 0 0 1 .73 2.72l-1 1.74a2 2 0 0 1-2.73.73l-.5-.3A8 8 0 0 1 15 19.43V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.58a8 8 0 0 1-1.92-1.11l-.5.29a2 2 0 0 1-2.74-.73l-1-1.74a2 2 0 0 1 .73-2.73l.5-.29a8.06 8.06 0 0 1 0-2.22l-.5-.3a2 2 0 0 1-.73-2.72l1-1.74a2 2 0 0 1 2.73-.73l.5.3A8 8 0 0 1 9 4.57zM7.88 7.64l-.54.51-1.77-1.02-1 1.74 1.76 1.01-.17.73a6.02 6.02 0 0 0 0 2.78l.17.73-1.76 1.01 1 1.74 1.77-1.02.54.51a6 6 0 0 0 2.4 1.4l.72.2V20h2v-2.04l.71-.2a6 6 0 0 0 2.41-1.4l.54-.51 1.77 1.02 1-1.74-1.76-1.01.17-.73a6.02 6.02 0 0 0 0-2.78l-.17-.73 1.76-1.01-1-1.74-1.77 1.02-.54-.51a6 6 0 0 0-2.4-1.4l-.72-.2V4h-2v2.04l-.71.2a6 6 0 0 0-2.41 1.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
              />
            </svg>
          </template>
        </ProgressIcon>
        <ProgressIcon
          class="w-1/4"
          :active="isActive(3)"
          :lined="true"
          @click="router.push('/further')"
        >
          <template #text>
            Further
          </template>
          <template #icon>
            <svg
              class="w-full fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                class="heroicon-ui"
                d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm-2.3-8.7l1.3 1.29 3.3-3.3a1 1 0 0 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-2-2a1 1 0 0 1 1.4-1.42z"
              />
            </svg>
          </template>
        </ProgressIcon>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 py-6">
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
