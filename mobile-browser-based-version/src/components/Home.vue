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
        <!-- Titanic's card-->
        <div v-for="card in $tm('home.cards')" :key="card.header.text">
          <card>
            <div
              class="ml-10 text-xl text-gray-500 dark:text-light ont-semibold"
            >
              <span class="text-primary-dark dark:text-primary-light">
                {{ card.header.text }}
                <span class="underline">{{ card.header.underlined }}</span>
              </span>
              <div v-for="item in card.items" :key="item">
                <p class="text-base" v-html="`- ${item}`"></p>
              </div>
            </div>
          </card>
        </div>

        <custom-button v-on:click="goToTaskList()">
          {{ $t('home.buttonText') }}
        </custom-button>
      </div>
    </section>
  </base-layout>
</template>

<script>
import BaseLayout from './containers/BaseLayout';
import CustomButton from './simple/CustomButton';
import Card from './containers/Card';
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
    Card,
    CustomButton,
  },
  methods: {
    ...mapMutations(['setActivePage']),
    goToTaskList() {
      this.setActivePage('tasks');
      this.$router.push({
        path: '/tasks',
      });
    },
  },
};
</script>
