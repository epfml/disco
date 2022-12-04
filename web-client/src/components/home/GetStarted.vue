<template>
  <div class="grid grid-cols-1 gap-8 md:mx-20 lg:gap-16 lg:grid-cols-3 items-stretch">
    <!-- List of tasks -->
    <ButtonCard
      title-placement="center"
      @action="goToTaskList()"
    >
      <template #title>
        Join a <span title="A group of (DIS)tributed users with similar data, (CO)llaborating to train a model"><span
          class="font-disco text-disco-cyan"
        >DISCO</span>llaborative</span> to train a model
      </template>
      <template #button>
        Train
      </template>
    </ButtonCard>
    <!-- Model testing -->
    <ButtonCard
      title-placement="center"
      @action="goToModelTesting()"
    >
      <template #title>
        Evaluate your <span class="font-disco text-disco-cyan">DISCO</span>-trained model
      </template>
      <template #button>
        Evaluate
      </template>
    </ButtonCard>
    <!-- Task creation -->
    <ButtonCard
      title-placement="center"
      @action="goToNewTaskCreationForm()"
    >
      <template #title>
        Add your own ML task to be trained in <span class="font-disco text-disco-cyan">DISCO</span>
      </template>
      <template #button>
        Create
      </template>
    </ButtonCard>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router'

import ButtonCard from '@/components/containers/ButtonCard.vue'

const router = useRouter()

const goToTaskList = (): void => { router.push({ path: '/list' }) }
const goToNewTaskCreationForm = (): void => { router.push({ path: '/create' }) }
const goToModelTesting = (): void => { router.push({ path: '/evaluate' }) }
</script>
