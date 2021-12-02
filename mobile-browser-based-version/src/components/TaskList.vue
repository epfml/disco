<template>
  <base-layout v-bind:withSection="true">
    <!-- Main Page Content -->
    <div
      v-for="task in tasks"
      :key="task.taskID"
      class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-1 xl:grid-cols-1"
    >
      <card>
        <div>
          <h6
            class="
              text-xl
              font-medium
              leading-none
              tracking-wider
              dark:group-hover:text-primary-light
            "
          >
            {{ task.displayInformation.taskTitle }}
          </h6>
        </div>
        <div class="ml-10">
          <ul class="text-base ont-semibold text-gray-500 dark:text-light">
            <span v-html="task.displayInformation.summary"></span>
          </ul>
        </div>
        <div class="py-2">
          <span>
            <custom-button v-on:click="goToSelection(task.taskID)">
              Join
            </custom-button>
          </span>
        </div>
      </card>
    </div>
  </base-layout>
</template>

<script>
import MainTaskFrame from '../components/main_frames/MainTaskFrame.vue';
import MainDescriptionFrame from '../components/main_frames/MainDescriptionFrame.vue';
import MainTrainingFrame from '../components/main_frames/MainTrainingFrame.vue';
import MainTestingFrame from '../components/main_frames/MainTestingFrame.vue';

import BaseLayout from './containers/BaseLayout.vue';
import Card from './containers/Card.vue';
import CustomButton from './simple/CustomButton.vue';

/**
 * WARNING: Temporary code until complete modularization of task objects.
 * In the meantine, import all custom task classes here.
 */
import { CsvTask } from '../task_definition/csv_task';
import { ImageTask } from '../task_definition/image_task';

import { defineComponent } from 'vue';
import { mapMutations } from 'vuex';

export default {
  name: 'task-list',
  components: {
    BaseLayout,
    Card,
    CustomButton,
  },
  data() {
    return {
      tasks: [],
    };
  },
  methods: {
    ...mapMutations(['addTask']),
    goToSelection(id) {
      this.$router.push({
        name: id.concat('.description'),
        params: { Id: id },
      });
    },
  },
  async mounted() {
    // To modularize
    let tasksURL = process.env.VUE_APP_DEAI_SERVER.concat('tasks');
    let rawTasks = await fetch(tasksURL).then((response) => response.json());
    rawTasks.forEach((task) => {
      console.log(`Processing ${task.taskID}`);
      let newTask;
      // TODO: avoid this switch by having one Task class completely determined by a json config
      switch (task.trainingInformation.dataType) {
        case 'csv':
          newTask = new CsvTask(
            task.taskID,
            task.displayInformation,
            task.trainingInformation
          );
          break;
        case 'image':
          newTask = new ImageTask(
            task.taskID,
            task.displayInformation,
            task.trainingInformation
          );
          break;
        default:
          console.log('No task object available');
          break;
      }
      console.log(newTask.displayInformation.taskTitle);
      this.tasks.push(newTask);
      // Definition of an extension of the task-related component
      var MainDescriptionFrameSp = defineComponent({
        extends: MainDescriptionFrame,
        name: newTask.taskID.concat('.description'),
        key: newTask.taskID.concat('.description'),
      });
      var MainTrainingFrameSp = defineComponent({
        extends: MainTrainingFrame,
        name: newTask.taskID.concat('.training'),
        key: newTask.taskID.concat('.training'),
      });
      var MainTestingFrameSp = defineComponent({
        extends: MainTestingFrame,
        name: newTask.taskID.concat('.testing'),
        key: newTask.taskID.concat('.testing'),
      });
      // Add task subroutes on the go
      let newTaskRoute = {
        path: '/'.concat(newTask.taskID),
        name: newTask.taskID,
        component: MainTaskFrame,
        props: { Id: newTask.taskID, Task: newTask },
        children: [
          {
            path: 'description',
            name: newTask.taskID.concat('.description'),
            component: MainDescriptionFrameSp,
            props: {
              Id: newTask.taskID,
              Task: newTask,
            },
          },
          {
            path: 'training',
            name: newTask.taskID.concat('.training'),
            component: MainTrainingFrameSp,
            props: {
              Id: newTask.taskID,
              Task: newTask,
            },
          },
          {
            path: 'testing',
            name: newTask.taskID.concat('.testing'),
            component: MainTestingFrameSp,
            props: {
              Id: newTask.taskID,
              Task: newTask,
            },
          },
        ],
      };
      this.$router.addRoute(newTaskRoute);
    });
    this.tasks.forEach((task) => this.addTask({ task: task }));
  },
};
</script>
