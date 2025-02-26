<template>
  <div class="space-y-8 mt-4">
    <div class="flex flex-col gap-4">
      <!-- In case no tasks were retrieved, suggest reloading the page -->
      <ButtonsCard
        v-if="taskStore.status == 'failed'"
        :buttons="List.of(['reload page', () => router.go(0)])"
        class="mx-auto"
      >
        <template #title> The server is unreachable </template>
        Please reload the app and make sure you are connected to internet.
      </ButtonsCard>

      <!-- Tasks could be retrieved, display them alphabetically -->
      <div
        id="tasks"
        class="contents"
        v-else
      >
        <IconCard class="justify-self-center w-full">
        <template #title> What are&nbsp;<DISCOllaboratives />? </template>
          <template #icon>
            <TasksIcon class="bi bi-ui-checks w-7 h-7 text-disco-cyan" />
          </template>

          <DISCOllaboratives /> are machine learning tasks, such as diagnosing COVID from ultrasounds or classifying hand written digits, that users can join to train and contribute to with their own data. To give you a sense of <DISCO />, we pre-defined some tasks
          along with some example datasets. The end goal is for users to create their own custom <DISCOllaborative /> and collaboratively train machine learning models.
          <br>By participating to a task, you can either choose to train a model with your own data only or join a collaborative training session with other users.
          If you want to bring your own collaborative task into <DISCO />, you can do so by <button
            class="text-blue-400"
            @click="goToCreateTask()"
          >creating a new <DISCOllaborative /></button>.
          <br/><br/> <b>The data you connect is only used locally and is never uploaded or shared with anyone. Data always stays on your device.</b>
        </IconCard>
        <div
          v-if="taskStore.status == 'loading'"
          class="my-10 flex flex-col justify-center items-center"
        >
          <VueSpinner size="50" color="#6096BA"/>
          <div class="mt-10 flex flex-col justify-center items-center">
            <p class="text-disco-blue">Loading <DISCOllaboratives /></p>
            <p class="text-disco-blue text-xs">This can take a few seconds</p>
          </div>
        </div>
        <div
          v-else
          v-for="task in sortedTasks"
          :id="task.id"
          :key="task.id"
        >
          <ButtonsCard
            buttons-justify="start"
            :buttons="List.of(['participate', () => toTask(task)])"
          >
            <template #title>
              <div class="flex flex-row justify-between flex-wrap">
                <div>{{ task.displayInformation.taskTitle }}</div>
                <div class="flex flex-row shrink-0 justify-end gap-1">
                  <div class="px-2 py-1 rounded-md flex items-center" :style="{ backgroundColor: getSchemeColor(task) }">
                    <div 
                      class="text-xs font-semibold text-slate-900"
                    >{{ task.trainingInformation.scheme.toUpperCase() }}</div>
                  </div>
                  <div class="px-2 py-1 rounded-md flex items-center" :style="{ backgroundColor: getDataTypeColor(task) }">
                    <div 
                      class="text-xs font-semibold text-slate-900"
                    >{{ task.trainingInformation.dataType.toUpperCase() }}</div>
                  </div>
                </div>
              </div>
            </template>

            <div>
              {{ task.displayInformation.summary.preview }}
            </div>
          </ButtonsCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { VueSpinner } from 'vue3-spinners';

import { List } from "immutable";

import type { DataType, Task } from "@epfml/discojs";

import { useTasksStore } from "@/store";
import { useTrainingStore } from "@/store";
import ButtonsCard from '@/components/containers/ButtonsCard.vue'
import IconCard from '@/components/containers/IconCard.vue'
import DISCO from '@/components/simple/DISCO.vue'
import TasksIcon from '@/assets/svg/TasksIcon.vue'
import DISCOllaborative from '@/components/simple/DISCOllaborative.vue'
import DISCOllaboratives from '@/components/simple/DISCOllaboratives.vue'

const router = useRouter()
const trainingStore = useTrainingStore()
const taskStore = useTasksStore()
const { tasks } = storeToRefs(taskStore)

const sortedTasks = computed(() => [...tasks.value.values()].sort(
  (task1, task2) => task1.displayInformation.taskTitle.localeCompare(task2.displayInformation.taskTitle)
))

function getSchemeColor(task: Task<DataType>): string {
  switch (task.trainingInformation.scheme) {
    case 'decentralized':
      return '#E656FF'
    case 'federated':
      return '#98def7'
    case 'local':
      return '#e95877'
  }
}

function getDataTypeColor(task: Task<DataType>): string {
  switch (task.trainingInformation.dataType) {
    case 'image':
      return '#95F88D'
    case 'tabular':
      return '#FF5B7E'
    case 'text':
      return '#FFFA68'
  }
}

function toTask(task: Task<DataType>): void {
  trainingStore.setTask(task.id)
  trainingStore.setStep(1)
  router.push(`/${task.id}`)
}

const goToCreateTask = (): void => {
  router.push({ path: '/create' })
}
</script>
