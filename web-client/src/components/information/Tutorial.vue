<template>
  <div>
    <!-- How to use Disco? -->
    <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
      <card custom-class="hover:text-primary dark:hover:text-light">
        <h6
          class="
              text-xl
              font-large
              leading-none
              tracking-wider
              dark:group-hover:text-light
              px-2
              py-6
            "
        >
          {{ $tm('information.howToUseTitle') }}
        </h6>
        <div class="ml-10">
          <div
            class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1"
          >
            <card
              v-for="card in $tm('information.howToUseCard')"
              :key="(card as any).title"
              custom-class="hover:text-primary dark:hover:text-light"
            >
              <div class="ml-10">
                <ul
                  class="text-lg ont-semibold text-gray-500 dark:text-light"
                >
                  <b>{{ (card as any).title }}</b>
                  {{ (card as any).text }}
                </ul>
              </div>
            </card>
          </div>
        </div>
        <div class="flex items-center justify-center space-x-8">
          <!-- Light button -->
          <CustomButton @click="router.push('/list')">
            explore examples
          </CustomButton>
          <CustomButton @click="router.push('/create')">
            create your own task
          </CustomButton>
        </div>
      </card>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onActivated } from 'vue'
import { useRouter } from 'vue-router'

import { useInformationStore } from '@/store/information'
import Card from '@/components/containers/Card.vue'

// TODO fix i18n types

const router = useRouter()
const informationStore = useInformationStore()
onActivated(() => { informationStore.step = 2 })
</script>
