<template>
  <base-layout v-bind:withSection="true">
    <div
      v-for="task in $store.getters.tasksFramesList"
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
            <custom-button v-on:click="goToSelection(task.taskID)">
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

/**
 * WARNING: Temporary code until complete modularization of task objects.
 * In the meantine, import all custom task classes here.
 */
import _ from 'lodash'
import { defineComponent } from 'vue'
import { mapMutations } from 'vuex'
import { getTaskClass } from '../task_definition/converter'

export default defineComponent({
  name: 'task-list',
  components: {
    BaseLayout,
    Card,
    CustomButton
  },
  data () {
    return {
      taskFramesInfo: [
        ['description', MainDescriptionFrame],
        ['training', MainTrainingFrame],
        ['testing', MainTestingFrame]
      ]
    }
  },
  methods: {
    ...mapMutations(['addTaskFrame', 'newTask', 'clearNewTasks']),
    goToSelection (id) {
      this.$router.push({
        name: id.concat('.description'),
        params: { Id: id }
      })
    },
    createNewTaskComponent (task) {
      console.log(`Processing ${task.taskID}`)
      const TaskClass = getTaskClass(task.trainingInformation.dataType)
      if (!TaskClass) {
        console.log(`Task ${task.taskID} was not processed`)
        return
      }
      const newTaskFrame = new TaskClass(
        task.taskID,
        task.displayInformation,
        task.trainingInformation
      )
      this.addTaskFrame(newTaskFrame) // commit to store
      const newTaskRoute = {
        path: '/'.concat(newTaskFrame.taskID),
        name: newTaskFrame.taskID,
        component: MainTaskFrame,
        props: { Id: newTaskFrame.taskID, Task: newTaskFrame },
        children: _.map(this.taskFramesInfo, (t) => {
          const [info, Frame] = t
          const name = `${newTaskFrame.taskID}.${info}`
          // Definition of an extension of the task-related component
          const component = defineComponent({
            extends: Frame,
            name: name,
            key: name
          })
          return {
            path: info,
            name: name,
            component: component,
            props: {
              Id: newTaskFrame.taskID,
              Task: newTaskFrame
            }
          }
        })
      }
      this.$router.addRoute(newTaskRoute)
    }
  },
  async mounted () {
    const tasksURL = process.env.VUE_APP_FEAI_SERVER.concat('tasks')
    const rawTasks = await fetch(tasksURL).then((response) => response.json())
    // TODO: not sure we need to clear new tasks?
    this.clearNewTasks()
    rawTasks
      .concat(this.$store.state.newTasks)
      .forEach(this.createNewTaskComponent)
    this.clearNewTasks()
  }
})
</script>
