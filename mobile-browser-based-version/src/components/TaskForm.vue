<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main class="flex-1">
      <!-- Main Page Content -->
      <div
        class="flex flex-col items-right justify-start flex-1 h-full min-h-screen overflow-y-auto"
      >
        <section class="flex-col items-center justify-center p-4 space-y-4">
          <div>
              Hello 
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

// WARNING: temporay code until serialization of Task object
// Import the tasks objects Here
import { CsvTask } from '../task_definition/csv_task';
import { ImageTask } from '../task_definition/image_task'

import { defineComponent } from 'vue';

export default {
  name: 'taskForm',
  methods: {
    goToSelection(id) {
      this.$router.push({
        name: id.concat('.description'),
        params: { Id: id },
      });
    },
  },
};
</script>
