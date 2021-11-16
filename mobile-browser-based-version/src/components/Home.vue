<template>
  <baseLayout customClass="pt-4">
      <!-- Welcoming words -->
      <div>
        <h1 class="text-xl pl-10 font-medium leading-none">
          <span class="text-primary-dark dark:text-primary-light">{{$t('title')}} </span>
          -
          <span class="text-primary-dark dark:text-primary-light">De</span
          >centralized
          <span class="text-primary-dark dark:text-primary-light">AI</span>
        </h1>
      </div>

      <section class="flex-col items-center justify-center p-4 space-y-4">
        <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
          <!-- Titanic's card-->
        
          <card>
            <div
              class="ml-10  text-xl text-gray-500 dark:text-light ont-semibold"
            >
              <span class="text-primary-dark dark:text-primary-light">
                Build AI with collaborators but
                <span class="underline">without sharing any data</span>
              </span>
              <p class="text-base">
                - Exchange <span class="italic">models</span> not data
              </p>
              <p class="text-base">- Keep data at its source</p>
            </div>
          </card>

          <customButton
            v-on:click="goToTaskList()"
          >
            Start building
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
