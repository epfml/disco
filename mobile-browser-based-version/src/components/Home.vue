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
            <span class="text-primary-dark dark:text-primary-light">DeAI </span>
            -
            <span class="text-primary-dark dark:text-primary-light">De</span
            >centralized
            <span class="text-primary-dark dark:text-primary-light">AI</span>
          </h1>
        </div>

        <section class="flex-col items-center justify-center p-4 space-y-4">
          <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
            <!-- Titanic's card-->
            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker dark:bg-dark"
            >
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
            </div>
            <button
              v-on:click="goToTaskList()"
              type="button"
              class="w-1/6 text-lg border-2 border-transparent bg-green-500 ml-9 py-2 px-4 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none duration-500 focus:outline-none"
            >
              Start building
            </button>
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
import { initializeIndexedDB } from '../helpers/my_memory_script/indexedDB_script';

export default {
  name: 'taskList',
  methods: {
    goToTaskList() {
      this.$emit('gototasks');
      this.$router.push({
        path: '/tasks',
      });
    },
  },
  mounted() {
    initializeIndexedDB();
  },
};
</script>
