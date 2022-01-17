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
            <p class="text-base">
              Go to settings
              <settings-icon customClass="inline w-5 h-5" />
              to change the platform
            </p>
          </title-card>
        </div>
      </div>
    </section>

    <!-- TODO: This section is not algined with the top, not sure why -->
    <section class="flex flex-row items-start pl-10">
      <custom-button v-on:click="goToTaskList()">
        {{ $t('home.startBuildingButtonText') }}
      </custom-button>
      <div class="w-1/6 flex flex-col space-y-sm mx-auto">
        <decentralized-image class="w-full h-full" />
        <p class="text-xs items-center pt-10">
          <span class="text-primary-dark dark:text-primary-light"
            >Decentralised learning</span
          >
          uses peer2peer communication weights are shared among the users while
          keeping your data local at all times.
        </p>
      </div>

      <div class="w-1/6 flex flex-col space-y-sm items-center mr-auto">
        <federated-image class="w-full h-full" />
        <p class="text-xs items-center pt-10">
          <span class="text-primary-dark dark:text-primary-light"
            >Federated learning</span
          >
          uses a central server weights are aggregated and then shared among the
          users while keeping your data local at all times.
        </p>
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
          <custom-button v-on:click="goToNewTaskCreationForm()">
            {{ $t('home.createTaskButtonText') }}
          </custom-button>
        </div>
      </div>
    </section>
  </base-layout>
</template>

<script>
import BaseLayout from './containers/BaseLayout.vue';
import CustomButton from './simple/CustomButton.vue';
import TitleCard from './containers/TitleCard.vue';
import FederatedImage from '../assets/svg/FederatedImage.vue';
import SettingsIcon from '../assets/svg/SettingsIcon.vue';
import DecentralizedImage from '../assets/svg/DecentralizedImage.vue';

import { useI18n } from 'vue-i18n';
import { mapMutations } from 'vuex';

export default {
  name: 'home',
  setup() {
    const { t, locale } = useI18n();
    return { t, locale };
  },
  components: {
    BaseLayout,
    TitleCard,
    CustomButton,
    FederatedImage,
    DecentralizedImage,
    SettingsIcon,
  },
  methods: {
    ...mapMutations(['setActivePage']),
    goToTaskList() {
      this.setActivePage('tasks');
      this.$router.push({
        path: '/tasks',
      });
    },
    goToNewTaskCreationForm() {
      this.setActivePage('task-creation-form');
      this.$router.push({
        path: '/task-creation-form',
      });
    },
  },
};
</script>
