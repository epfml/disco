<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main class="flex-1 pt-4">
      <!-- Main Page Content -->
      <div
        class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen overflow-y-auto"
      >
        <!-- Welcoming words -->
        <div>
          <h1 class="text-xl pl-10 font-medium leading-none">
            <span class="text-primary-dark dark:text-primary-light"
              >Welcome.</span
            >
            To start training, pick a task in the list bellow. Have fun!
          </h1>
        </div>

        <!-- Titanic's card-->
        <section class="flex-col items-center justify-center p-4 space-y-4">
          <div class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1">
            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
            >
              <div>
                <h6
                  class="text-xl font-medium leading-none tracking-wider uppercase dark:group-hover:text-darker"
                >
                  Titanic
                </h6>
              </div>
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  In this challenge, we ask you to build a predictive model that
                  answers the question: “what sorts of people were more likely
                  to survive?” using passenger data (ie name, age, gender,
                  socio-economic class, etc)..
                </ul>
              </div>
              <div>
                <span>
                  <a
                    v-on:click="goToSelection()"
                    class="no-underline font-medium"
                    >Click here to participate</a
                  >
                </span>
              </div>
            </div>

            <!-- MNIST card-->
            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
            >
              <div>
                <h6
                  class="text-xl font-medium leading-none tracking-wider uppercase dark:group-hover:text-darker"
                >
                  MNIST
                </h6>
              </div>
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  Life started by learning numbers, well you've come a full
                  circle! let's get back to it ! From the MNIST dataset of
                  handwritten digits, can you identify them?
                </ul>
              </div>
              <div>
                <span>
                  <a
                    v-on:click="this.$router.push({ path: mnist })"
                    class="no-underline font-medium"
                    >Click here to participate</a
                  >
                </span>
              </div>
            </div>

             <!-- LUS-Covid card-->
            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
            >
              <div>
                <h6
                  class="text-xl font-medium leading-none tracking-wider uppercase dark:group-hover:text-darker"
                >
                  LUS-COVID
                </h6>
              </div>
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  COVID-19 is the biggest problem of the first of the 21st century, using LUS-COVID model we are detecting COVID from lung ultrasound images.
                </ul>
              </div>
              <div>
                <span>
                  <a
                    v-on:click="this.$router.push({ path: lus_covid })"
                    class="no-underline font-medium"
                    >Click here to participate</a
                  >
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Main Page Footer-->
      <footer
        class="flex items-center justify-between p-4 bg-white border-t dark:bg-darker dark:border-primary-darker"
      >
        <div>De-AI &copy; 2021</div>
        <div>
          Join us on
          <a
            href="https://github.com/epfml/DeAI"
            target="_blank"
            class="text-blue-500 hover:underline"
            >Github</a
          >
        </div>
      </footer>
    </main>
  </div>
</template>

<script>
import {initialize_indexedDB} from "../helpers/indexedDB_script"

export default {
  name: "taskList",
  data() {
    return {
      taskSelected: "",
      mnist: "/mnist-model/description",
      lus_covid: "/lus-covid-model/description"
    };
  },
  methods: {
    goToSelection(task_name) {
      this.$router.push({ path: "/titanic-model/description" });
    },
  },
  mounted() {
    initialize_indexedDB()
  }
};
</script>