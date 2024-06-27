<template>
  <div class="grid grid-cols-1 gap-8 md:mx-20 lg:gap-16 lg:grid-cols-3 items-stretch">
     <!-- Model testing -->
    <ButtonCard
      title-placement="center"
      @action="goToDiscoInformation()"
    >
      <template #title>
        Learn more about <span class="font-disco text-disco-cyan">DISCO</span> and collaborative fundamentals
      </template>
      <template #button>
        learn more
      </template>
    </ButtonCard>
    <!-- List of tasks -->
    <ButtonCard
      title-placement="center"
      @action="goToTaskList()"
    >
      <template #title>
        Train a model and contribute to existing <span title="Click Explore to learn more on DISCOllaboratives"><DISCOllaborative/>s</span>
      </template>
      <template #button>
        explore
      </template>
    </ButtonCard>
    <!-- Task creation -->
    <ButtonCard
      title-placement="center"
      @action="goToNewTaskCreationForm()"
    >
      <template #title>
        Add your own ML problem to the list of <DISCOllaborative/>s
      </template>
      <template #button>
        create
      </template>
    </ButtonCard>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router'
import DISCOllaborative from '@/components/simple/DISCOllaborative.vue'

import ButtonCard from '@/components/containers/ButtonCard.vue'

const router = useRouter()

const goToTaskList = (): void => { router.push({ path: '/list' }) }
const goToNewTaskCreationForm = (): void => { router.push({ path: '/create' }) }
const goToDiscoInformation = (): void => { router.push({ path: '/information' }) }
</script>
