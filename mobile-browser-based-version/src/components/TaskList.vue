<template>
  <base-layout :withSection="true">
    <div
      v-for="task in Array.from(tasks.values())"
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
              group-hover:text-primary-light
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
            <custom-button @click="goToSelection(task.taskID)">
              Join
            </custom-button>
          </span>
        </div>
      </card>
    </div>
  </base-layout>
</template>

<script lang="ts">
import MainTaskFrame from '../components/main_frames/MainTaskFrame.vue'
import MainDescriptionFrame from '../components/main_frames/MainDescriptionFrame.vue'
import MainTrainingFrame from '../components/main_frames/MainTrainingFrame.vue'
import MainTestingFrame from '../components/main_frames/MainTestingFrame.vue'
import BaseLayout from './containers/BaseLayout.vue'
import Card from './containers/Card.vue'
import CustomButton from './simple/CustomButton.vue'

import _ from 'lodash'
import { defineComponent } from 'vue'
import { mapMutations } from 'vuex'
import { loadTasks } from '../core/task/utils'
import { Task } from '../core/task/task'

export default defineComponent({
  name: 'task-list',
  components: {
    BaseLayout,
    Card,
    CustomButton
  },
  data () {
    return {
      tasks: new Map<string, Task>(),
      taskFramesInfo: [
        ['description', MainDescriptionFrame],
        ['training', MainTrainingFrame],
        ['testing', MainTestingFrame]
      ]
    }
  },
  methods: {
    ...mapMutations(['addTask']),
    goToSelection (id: string) {
      this.$router.push({
        name: id.concat('.description'),
        params: { id: id }
      })
    },
    createNewTaskComponent (task: Task) {
      this.tasks.set(task.taskID, task)

      const newTaskRoute = {
        path: '/'.concat(task.taskID),
        name: task.taskID,
        component: MainTaskFrame,
        props: { id: task.taskID, task: task },
        children: _.map(this.taskFramesInfo, (t) => {
          const [info, frame] = t
          const name = `${task.taskID}.${info}`
          const component = defineComponent({
            extends: frame,
            name: name,
            key: name
          })
          return {
            path: info,
            name: name,
            component: component,
            props: {
              id: task.taskID,
              task: task
            }
          }
        })
      }
      this.$router.addRoute(newTaskRoute)
    }
  },
  async created () {
    this.tasks.clear()
    const tasks: Task[] = await loadTasks()
    _.forEach(tasks, this.createNewTaskComponent)
    const array: Task[] = Array.from(this.tasks.values())
    _.forEach(array, e => console.log(e.taskID, e.displayInformation, e.displayInformation.taskTitle))
  }
})
</script>
