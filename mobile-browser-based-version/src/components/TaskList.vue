<template>
  <div class="flex flex-1 h-screen overflow-y-scroll">
    <!-- Main Page Header -->
    <main class="flex-1">
      <!-- Main Page Content -->
      <div
        class="flex flex-col items-right justify-start flex-1 h-full min-h-screen overflow-y-auto"
      >
        <section class="flex-col items-center justify-center p-4 space-y-4">
          <div
            v-for="task in tasks"
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
// Task's main frames
import MainTaskFrame from '../components/main_frames/MainTaskFrame';
import MainDescriptionFrame from '../components/main_frames/MainDescriptionFrame';
import MainTrainingFrame from '../components/main_frames/MainTrainingFrame';
import MainTestingFrame from '../components/main_frames/MainTestingFrame';

// WARNING: temporay code until serialization of Task object
// Import the tasks objects Here
import { CsvTask } from '../task_definition/csv_task';
import { ImageTask } from '../task_definition/image_task'

import { defineComponent } from 'vue';

export default {
  name: 'taskList',
  data() {
    return {
      taskSelected: '',
      mnist: '/mnist-model/description',
      tasks: [],
      tasksUrl: 'https://deai-313515.ew.r.appspot.com/tasks',
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
  async mounted() {
    let tasks = await fetch(this.tasksUrl)
      .then(response => response.json())
      .then(tasks => {
        for (let task of tasks) {
          console.log(`Processing ${task.taskId}`);
          let newTask;
          // TODO: avoid this switch by having one Task class completely determined by a json config
          switch (task.trainingInformation.dataType) {
            case 'csv':
              newTask = new CsvTask(
                task.taskId,
                task.displayInformation,
                task.trainingInformation
              );
              break;
            case 'image':
              newTask = new ImageTask(
                task.taskId,
                task.displayInformation,
                task.trainingInformation
              );
              break;
            default:
              console.log('No task object available');
              break;
          }
          this.tasks.push(newTask);
          // Definition of an extension of the task-related component
          var MainDescriptionFrameSp = defineComponent({
            extends: MainDescriptionFrame,
            name: newTask.trainingInformation.modelId.concat('.description'),
            key: newTask.trainingInformation.modelId.concat('.description'),
          });
          var MainTrainingFrameSp = defineComponent({
            extends: MainTrainingFrame,
            name: newTask.trainingInformation.modelId.concat('.training'),
            key: newTask.trainingInformation.modelId.concat('.training'),
          });
          var MainTestingFrameSp = defineComponent({
            extends: MainTestingFrame,
            name: newTask.trainingInformation.modelId.concat('.testing'),
            key: newTask.trainingInformation.modelId.concat('.testing'),
          });
          // Add task subroutes on the go
          let newTaskRoute = {
            path: '/'.concat(newTask.trainingInformation.modelId),
            name: newTask.trainingInformation.modelId,
            component: MainTaskFrame,
            props: { Id: newTask.trainingInformation.modelId, Task: newTask },
            children: [
              {
                path: 'description',
                name: newTask.trainingInformation.modelId.concat(
                  '.description'
                ),
                component: MainDescriptionFrameSp,
                props: {
                  Id: newTask.trainingInformation.modelId,
                  Task: newTask,
                },
              },
              {
                path: 'training',
                name: newTask.trainingInformation.modelId.concat('.training'),
                component: MainTrainingFrameSp,
                props: {
                  Id: newTask.trainingInformation.modelId,
                  Task: newTask,
                },
              },
              {
                path: 'testing',
                name: newTask.trainingInformation.modelId.concat('.testing'),
                component: MainTestingFrameSp,
                props: {
                  Id: newTask.trainingInformation.modelId,
                  Task: newTask,
                },
              },
            ],
          };
          this.$router.addRoute(newTaskRoute);
        }
      });
      for (let task of this.tasks) {
        await this.$store.commit('addTask', {task: task});
      }
  },
};
</script>
