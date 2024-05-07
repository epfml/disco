<template>
  <div class="flex justify-center">
    <IconCard class="justify-self-center w-full lg:w-4/5">
      <template #title>
        {{ $tm('information.howToUseTitle') }}
      </template>
      <template #content>
        <div
          v-for="card in $tm('information.howToUseCard') "
          :key="(card as any).title"
            class="mb-4"
        >
          <b>{{ (card as any).title }}</b><br>
          <p>{{ (card as any).text }}</p>
      </div>
      <div class="flex items-center justify-center space-x-8">
        <CustomButton @click="router.push('/list')">
          explore DISCOllaboratives
        </CustomButton>
        <CustomButton @click="router.push('/create')">
          create your own task
        </CustomButton>
        </div>
      </template>
    </IconCard>
  </div>
</template>

<script lang="ts" setup>
import { onActivated } from 'vue'
import { useRouter } from 'vue-router'

import { useInformationStore } from '@/store/information'
import IconCard from '@/components/containers/IconCard.vue'
import CustomButton from '@/components/simple/CustomButton.vue'

// TODO fix i18n types

const router = useRouter()
const informationStore = useInformationStore()
onActivated(() => { informationStore.step = 2 })
</script>
