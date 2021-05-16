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
            :key="task.training_information.model_id"
            class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1"
          >
            <!-- Titanic's card-->
            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
              v-on:click="goToSelection(task.training_information.model_id)"
            >
              <div>
                <h6
                  class="text-xl font-medium leading-none tracking-wider uppercase dark:group-hover:text-darker"
                >
                  {{task.display_information.taskTitle}}
                </h6>
              </div>
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  {{task.display_information.summary}}
                </ul>
              </div>
              <div>
                <span>
                  <a class="no-underline font-medium"
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
import { initialize_indexedDB } from "../helpers/Memory Script/indexedDB_script";
import { ALL_TASKS } from "../router/index";

export default {
  name: "taskList",
  data() {
    return {
      taskSelected: "",
      mnist: "/mnist-model/description",
      ALL_TASKS: ALL_TASKS,
    };
  },
  methods: {
    goToSelection(id) {
      this.$router.push({
        name: "description",
        params: { Id: id },
      });
    },
  },
  mounted() {
    initialize_indexedDB();
  },
};
</script>