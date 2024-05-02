<template>
  <div class="grid grid-cols-1 gap-8 md:mx-20 lg:gap-16 lg:grid-cols-3 items-stretch">
     <!-- Model testing -->
    <ButtonCard
      title-placement="center"
      @action="goToDiscoInformation()"
    >
      <template #title>
        Learn more about <span class="font-disco text-disco-cyan">DISCO</span> and distributed learning fundamentals
      </template>
      <template #button>
        more info
      </template>
    </ButtonCard>
    <!-- List of tasks -->
    <ButtonCard
      title-placement="center"
      @action="goToTaskList()"
    >
      <template #title>
        Train a model on existing <span title="A group of (DIS)tributed users with similar data, (CO)llaborating to train a model"><span
          class="font-disco text-disco-cyan"
        >DISCO</span>llaboratives</span>
      </template>
      <template #button>
        train
      </template>
    </ButtonCard>
    <!-- Task creation -->
    <ButtonCard
      title-placement="center"
      @action="goToNewTaskCreationForm()"
    >
      <template #title>
        Add your own ML task to the <span title="A group of (DIS)tributed users with similar data, (CO)llaborating to train a model"><span
          class="font-disco text-disco-cyan"
        >DISCO</span>llaboratives</span>
      </template>
      <template #button>
        create
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
const goToDiscoInformation = (): void => { router.push({ path: '/information' }) }
</script>
