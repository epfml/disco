<template>
  <base-layout customClass="pt-4">
    <!-- Welcoming words -->
    <div>
      <h1 class="text-xl pl-10 font-medium leading-none">
        <span class="text-primary-dark dark:text-primary-light"
          >{{ $t('home.title.name') }}
        </span>
        -
        <span class="text-primary-dark dark:text-primary-light">{{
          $t('home.title.start')
        }}</span
        >{{ $t('home.title.middle') }}
        <span class="text-primary-dark dark:text-primary-light">{{
          $t('home.title.end')
        }}</span>
      </h1>
    </div>

    <section class="flex-col items-center justify-center p-4 space-y-4">
      <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
        <div v-for="build in $tm('home.buildCard')" :key="build.header.text">
          <title-card
            :title="build.header.text"
            :titleUnderlined="build.header.underlined"
          >
            <div v-for="item in build.items" :key="item">
              <p v-html="`- ${item}`"></p>
            </div>
          </title-card>
        </div>
      </div>
    </section>

    <!-- TODO: This section is not algined with the top, not sure why -->
    <div class="flex flex-row items-start pl-10">
      <custom-button v-on:click="goToTaskList()">
        {{ $t('home.startBuildingButtonText') }}
      </custom-button>

      <div class="w-1/6 flex flex-col items-center mx-auto">
        <card customClass="space-y-sm">
          <decentralized-image class="w-full h-full" />
          <p class="text-xs items-center pt-10">
            <span class="text-primary-dark dark:text-primary-light">{{
              $t('home.images.decentralised.title')
            }}</span>
            {{ $t('home.images.decentralised.text') }}
          </p>
        </card>
      </div>

      <div class="w-1/6 flex flex-col items-center mr-auto">
        <card customClass="space-y-sm">
          <federated-image class="w-full h-full" />
          <p class="text-xs items-center pt-10">
            <span class="text-primary-dark dark:text-primary-light">{{
              $t('home.images.federated.title')
            }}</span>
            {{ $t('home.images.federated.text') }}
          </p>
        </card>
      </div>
    </div>

    <section class="flex-col items-center justify-center p-4 space-y-4">
      <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
        <div v-for="task in $tm('home.taskCard')" :key="task.header.text">
          <title-card
            :title="task.header.text"
            :titleUnderlined="task.header.underlined"
          >
            <div v-for="item in task.items" :key="item">
              <p v-html="`- ${item}`"></p>
            </div>
          </title-card>
        </div>

        <div class="pt-4">
          <custom-button v-on:click="goToNewTaskCreationForm()">
            {{ $t('home.createTaskButtonText') }}
          </custom-button>
        </div>
      </div>
    </section>
  </base-layout>
</template>

<script lang="ts">
import BaseLayout from './containers/BaseLayout.vue'
import CustomButton from './simple/CustomButton.vue'
import TitleCard from './containers/TitleCard.vue'
import FederatedImage from '../assets/svg/FederatedImage.vue'
import DecentralizedImage from '../assets/svg/DecentralizedImage.vue'
import Card from './containers/Card.vue'
import { defineComponent } from 'vue'

import { mapMutations } from 'vuex'

export default defineComponent({
  name: 'home-page',
  setup () {
  },
  components: {
    BaseLayout,
    TitleCard,
    CustomButton,
    FederatedImage,
    DecentralizedImage,
    Card
  },
  methods: {
    ...mapMutations(['setActivePage']),
    goToTaskList () {
      this.setActivePage('tasks')
      this.$router.push({
        path: '/tasks'
      })
    },
    goToNewTaskCreationForm () {
      this.setActivePage('task-creation-form')
      this.$router.push({
        path: '/task-creation-form'
      })
    }
  }
})
</script>
