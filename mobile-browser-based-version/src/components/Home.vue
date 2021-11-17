<template>
  <baseLayout customClass="pt-4">
      <!-- Welcoming words -->
      <div>
        <h1 class="text-xl pl-10 font-medium leading-none">
          <span class="text-primary-dark dark:text-primary-light">{{$t('home.title.name')}} </span>
          -
          <span class="text-primary-dark dark:text-primary-light">{{$t('home.title.start')}}</span
          >{{$t('home.title.middle')}}
          <span class="text-primary-dark dark:text-primary-light">{{$t('home.title.end')}}</span>
        </h1>
      </div>

      <section class="flex-col items-center justify-center p-4 space-y-4">
        <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
          <!-- Titanic's card-->
          <div v-for="card in $tm('home.cards')" :key="card.header.text">
          <card>
            <div
              class="ml-10  text-xl text-gray-500 dark:text-light ont-semibold"
            >
              <span class="text-primary-dark dark:text-primary-light">
                {{card.header.text}}
                <span class="underline">{{card.header.underlined}}</span>
              </span>
              <div v-for="item in card.items" :key="item">
              <p class="text-base" v-html="`- ${item}`"></p>
              </div>
            </div>
          </card>
          </div>

          <customButton
            v-on:click="goToTaskList()"
          >
           {{$t('home.buttonText')}}
          </customButton>
        </div>
      </section>
  </baseLayout>
</template>

<script>
import { initializeIndexedDB } from "../helpers/my_memory_script/indexedDB_script";
import baseLayout from "./containers/BaseLayout";
import customButton from "./simple/CustomButton";
import card from "./containers/Card"
import { useI18n } from "vue-i18n";
export default {
  name: "taskList",
  setup() {
    const {t, locale} = useI18n();
    return  {t, locale};
  },
  components: {baseLayout,card,customButton},
  methods: {
    goToTaskList() {
      this.$emit("gototasks");
      this.$router.push({
        path: "/tasks",
      });
    },
  },
  mounted() {
    initializeIndexedDB();
  },
};
</script>
