<template>
  <div class="space-y-8">
    <h1 class="text-disco-cyan font-disco text-3xl text-center">
      Test & Validation
    </h1>
    <div class="hidden md:flex mx-auto">
      <ProgressIcon
        class="w-1/3"
        :lined="false"
        :active="true"
        @click="handleRoute(0)"
      >
        <template #text>
          Choose Model
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
        class="w-1/3"
        :lined="true"
        :active="isActive(1)"
        @click="handleRoute(1)"
      >
        <template #text>
          Connect Your Data
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
        class="w-1/3"
        :lined="true"
        :active="isActive(2)"
        @click="handleRoute(2)"
      >
        <template #text>
          Test Your Model
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
    </div>
  </div>
</template>
<script setup lang="ts">
import { useValidationStore } from '@/store/validation'
import { useMemoryStore } from '@/store/memory'
import { useToaster } from '@/composables/toaster'
import ProgressIcon from './ProgressIcon.vue'

const toaster = useToaster()
const validationStore = useValidationStore()
const memoryStore = useMemoryStore()

const isActive = (step: number): boolean => step <= validationStore.step
const handleRoute = (step: number): void => {
  if (memoryStore.models.size === 0) {
    toaster.error('Please train a model beforehand')
  } else if (validationStore.model === undefined) {
    toaster.error('Please select a model')
  } else {
    validationStore.step = step
  }
}
</script>
