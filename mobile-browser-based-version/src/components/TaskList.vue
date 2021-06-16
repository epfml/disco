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
            v-for="task in tasks"
            :key="task.taskId"
            class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1"
          >
            <!-- Titanic's card-->
            <div
              class="group flex-col items-center justify-between p-4 bg-white rounded-md dark:bg-darker hover:text-primary hover:bg-primary-100 dark:hover:text-light dark:hover:bg-primary-dark dark:bg-dark"
              v-on:click="goToSelection(task.taskId)"
            >
              <div>
                <h6
                  class="text-xl font-medium leading-none tracking-wider uppercase dark:group-hover:text-darker"
                >
                  {{ task.displayInformation.taskTitle }}
                </h6>
              </div>
              <div class="ml-10">
                <ul class="text-lg ont-semibold text-gray-500 dark:text-light">
                  {{
                    task.displayInformation.summary
                  }}
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
import { serverManager } from '../helpers/communication_script/server_manager'
import { TitanicTask } from '../task_definition/titanic'
import { MnistTask } from '../task_definition/titanic'
import { LusCovidTask } from '../task_definition/titanic'

import MainTaskFrame from '../components/main_frames/MainTaskFrame'
import MainDescriptionFrame from '../components/main_frames/MainDescriptionFrame'
import MainTrainingFrame from '../components/main_frames/MainTrainingFrame'
import MainTestingFrame from '../components/main_frames/MainTestingFrame'

export default {
  name: 'taskList',
  data() {
    return {
      taskSelected: '',
      mnist: '/mnist-model/description',
      tasks: [],
    };
  },
  methods: {
    goToSelection(id) {
      this.$router.push({
        path: '/' + id + '/description',
      });
    },
  },
  async mounted() {
      serverManager.setParams('localhost', 3000); // Could be manually modified by the user in the UI
      let tasks = await serverManager.getTasks()
          .then((response) => response.json())
          .then(tasks => {
              console.log(tasks)

              for (let task of tasks) {
                  console.log(`Processing ${task.taskId}`)
                  let newTask
                  // Boilerplate switch for wrapping tasks, as they still require hardcoded local functions
                  switch (task.taskId) {
                    case 'titanic':
                      newTask = new TitanicTask(task.taskId, task.displayInformation, task.trainingInformation)
                      break
                    default:
                      console.log('No task object available')
                      break
                  }
                  this.tasks.push(newTask)

                  // Definition of an extension of the task-related component
                  var MainTaskFrameSp = { extends: MainTaskFrame }
                  var MainDescriptionFrameSp = { extends: MainDescriptionFrame }
                  var MainTrainingFrameSp = { extends: MainTrainingFrame }
                  var MainTestingFrameSp = { extends: MainTestingFrame }

                  // Add task subroutes on the go
                  let newTaskRoute = {
                    path: '/' + newTask.taskId,
                    name: newTask.taskId,
                    component: MainTaskFrameSp,
                    props: { Id: newTask.taskId, Task: newTask },
                    children: [
                      {
                        path: 'description',
                        component: MainDescriptionFrameSp,
                        props: { Id: newTask.taskId, Task: newTask },
                      },
                      {
                        path: 'training',
                        component: MainTrainingFrameSp,
                        props: { Id: newTask.taskId, Task: newTask },
                      },
                      {
                        path: 'testing',
                        component: MainTestingFrameSp,
                        props: { Id: newTask.taskId, Task: newTask },
                      }
                    ]
                  }
                  this.$router.addRoute(newTaskRoute)
                  console.log(this.$router.getRoutes())
              }
          })
  }
}
</script>
