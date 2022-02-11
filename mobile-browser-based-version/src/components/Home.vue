<template>
  <base-layout customClass="pt-4">
    <!-- Welcoming words -->
    <custom-header />
    <!-- Information sections -->
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
      <custom-button @click="goToTaskList()">
        {{ $t('home.startBuildingButtonText') }}
      </custom-button>
    </div>
    <section class="flex-col items-center justify-center p-4 space-y-4">
      <!-- Decentralised insight -->
      <div class="grid gap-8 p-4 sm:grid-cols-2">
        <div class="flex flex-col items-center mx-auto">
          <title-card
            title="Insights: "
            :titleUnderlined="$t('home.images.decentralised.title')"
          >
            <div class="flex justify-center my-md">
              <decentralized-image class="sm:w-full md:w-3/5" />
            </div>
            <div>
              <span class="text-primary-dark dark:text-primary-light">{{
                $t('home.images.decentralised.title')
              }}</span>
              {{ $t('home.images.decentralised.text') }}
            </div>
          </title-card>
        </div>
        <!-- Federated insight -->
        <div class="flex flex-col items-center mx-auto">
          <title-card
            title="Insights: "
            :titleUnderlined="$t('home.images.federated.title')"
          >
            <div class="flex justify-center my-md">
              <federated-image class="sm:w-full md:w-3/5" />
            </div>
            <div>
              <span class="text-primary-dark dark:text-primary-light">{{
                $t('home.images.federated.title')
              }}</span>
              {{ $t('home.images.federated.text') }}
            </div>
          </title-card>
        </div>
      </div>
    </section>

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
          <custom-button @click="goToNewTaskCreationForm()">
            {{ $t('home.createTaskButtonText') }}
          </custom-button>
        </div>
      </div>
    </section>
  </base-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import BaseLayout from './containers/BaseLayout.vue';
import TitleCard from './containers/TitleCard.vue';
import CustomHeader from './simple/CustomHeader.vue';
import CustomButton from './simple/CustomButton.vue';
import FederatedImage from '../assets/svg/FederatedImage.vue';
import DecentralizedImage from '../assets/svg/DecentralizedImage.vue';

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
    CustomHeader,
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
