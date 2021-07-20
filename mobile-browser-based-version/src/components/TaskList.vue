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

        <section class="flex-col items-center justify-center p-4 space-y-4">
          <div
            v-for="task in ALL_TASKS"
            :key="task.trainingInformation.modelId"
            class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1"
          >
            <!-- Titanic's card-->
            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker dark:bg-dark"
            >
              <div>
                <h6
                  class="text-xl font-medium leading-none tracking-wider dark:group-hover:text-darker"
                >
                  {{ task.displayInformation.taskTitle }}
                </h6>
              </div>
              <div class="ml-10">
                <ul
                  class="text-base ont-semibold text-gray-500 dark:text-light"
                >
                  <span v-html="task.displayInformation.summary"></span>
                </ul>
              </div>
              <div class="py-2">
                <span>
                  <button
                    v-on:click="goToSelection(task.trainingInformation.modelId)"
                    type="button"
                    class="w-1/6 text-lg border-2 border-transparent bg-green-500 my-2 font-bold uppercase text-white rounded transform transition motion-reduce:transform-none duration-500 focus:outline-none"
                  >
                    Join
                  </button>
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
import { ALL_TASKS } from '../router/index';

export default {
  name: 'taskList',
  data() {
    return {
      taskSelected: '',
      mnist: '/mnist-model/description',
      ALL_TASKS: ALL_TASKS,
    };
  },
  methods: {
    goToSelection(id) {
      this.$router.push({
        name: id.concat('.description'),
        params: { Id: id },
      });
      /*
      this.$router.push({
        path: "/".concat(id).concat("/description"),
        query: {Id:id}
      });*/
    },
  },
};
</script>
