<template>
  <div class="space-y-8 mt-8 md:mt-16">
    <div class="flex flex-col gap-4 mt-8">
      <!-- In case no tasks were retrieved, suggest reloading the page -->
      <ButtonCard
        v-if="tasks.size === 0"
        class="mx-auto"
        @action="() => { router.go(0) }"
      >
        <template #title>
          Tasks could not be retrieved
        </template>
        <template #text>
          Please press the button below to reload the app. Please ensure the Disco server is up and running.
        </template>
        <template #button>
          reload page
        </template>
      </ButtonCard>

      <!-- Tasks could be retrieved, display them alphabetically -->
      <div
        id="tasks"
        class="contents"
        v-else
      >
        <IconCard class="justify-self-center w-full">
        <template #title>
          What are DISCOllaboratives?
        </template>
          <template #icon>
            <Tasks/>
          </template>
          <template #content>
          DISCOllaboratives are machine learning tasks, such as diagnosing COVID from ultrasounds or classifying hand written digits, that users can join to train on their own respective data. Some are already pre-defined
          along with some example data to let you get a sense of how to use DISCO.
          By participating, you can either choose to train a model on your own data or join a collaborative training session with other users.
          If you want to bring your own collaborative task into DISCO, you can do so by <button
            class="text-blue-400"
            @click="goToCreateTask()"
          >creating a new DISCOllaborative</button>.
          <br/><br/> <b>The data you connect is never uploaded or shared with anyone and always stays on your computer.</b>
          </template>
        </IconCard>
        <div
          v-for="task in sortedTasks"
          :id="task.id"
          :key="task.id"
        >
          <ButtonCard
            button-placement="left"
            @action="() => toTask(task)"
          >
            <template #title>
              {{ task.displayInformation.taskTitle }} - {{ task.trainingInformation.scheme }}
            </template>
            <template #text>
              <div v-html="task.displayInformation.summary.preview" />
            </template>
            <template #button>
              participate
            </template>
          </ButtonCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import type { Task } from '@epfml/discojs'

import { useTasksStore } from '@/store/tasks'
import { useTrainingStore } from '@/store/training'
import ButtonCard from '@/components/containers/ButtonCard.vue'
import IconCard from '@/components/containers/IconCard.vue'
import Tasks from '@/assets/svg/Tasks.vue'


const router = useRouter()
const trainingStore = useTrainingStore()
const { tasks } = storeToRefs(useTasksStore())

const sortedTasks = computed(() => [...tasks.value.values()].sort(
  (task1, task2) => task1.displayInformation.taskTitle.localeCompare(task2.displayInformation.taskTitle)
))

const scrollToTop = () => {
  const appElement = document.getElementById('main-page');
  if (appElement) {
    appElement.scrollTop = 0;
  }
}

const toTask = (task: Task): void => {
  trainingStore.setTask(task.id);
  router.push(`/${task.id}`)
  scrollToTop()
}

const goToCreateTask = (): void => {
  router.push({ path: '/create' })
}
</script>
