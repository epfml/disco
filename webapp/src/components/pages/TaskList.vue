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
          The server is unreachable
        </template>
        <template #text>
          Please reload the app and make sure you are connected to internet. If the error persists please <a class='underline text-primary-dark dark:text-primary-light' href='https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw'>reach out on Slack</a>.
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
          What are <DISCOllaborative/>s?
        </template>
          <template #icon>
            <Tasks/>
          </template>
          <template #content>
          <DISCOllaborative/> are machine learning tasks, such as diagnosing COVID from ultrasounds or classifying hand written digits, that users can join to train and contribute to with their own data. To give you a sense of DISCO, we pre-defined some tasks
          along with some example datasets. The end goal is for users to create their own custom <DISCOllaborative/> and collaboratively train machine learning models.
          <br>By participating to a task, you can either choose to train a model with your own data only or join a collaborative training session with other users.
          If you want to bring your own collaborative task into DISCO, you can do so by <button
            class="text-blue-400"
            @click="goToCreateTask()"
          >creating a new <DISCOllaborative/></button>.
          <br/><br/> <b>The data you connect is only used locally and is never uploaded or shared with anyone. Data always stays on your device.</b>
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
import DISCOllaborative from '@/components/simple/DISCOllaborative.vue'


const router = useRouter()
const trainingStore = useTrainingStore()
const { tasks } = storeToRefs(useTasksStore())

const sortedTasks = computed(() => [...tasks.value.values()].sort(
  (task1, task2) => task1.displayInformation.taskTitle.localeCompare(task2.displayInformation.taskTitle)
))

const toTask = (task: Task): void => {
  trainingStore.setTask(task.id)
  router.push(`/${task.id}`)
}

const goToCreateTask = (): void => {
  router.push({ path: '/create' })
}
</script>
