<template>
  <div class="space-y-8 mt-4">
      <!-- In case no tasks were retrieved, suggest reloading the page -->
      <ButtonsCard
        v-if="sortedTasks === 'failed'"
        :buttons="List.of(['reload page', () => router.go(0)])"
        class="mx-auto"
      >
        <template #title> The server is unreachable </template>
        Please reload the app and make sure you are connected to internet.
      </ButtonsCard>

      <!-- Tasks could be retrieved, display them alphabetically -->
      <div
        class="contents"
        v-else
      >
        <div class="max-w-[700px] lg:max-w-full mx-auto flex flex-col lg:flex-row justify-center items-start">
        <!-- swap ordering with screen width to ensure text is at the top on narrow screens and on the right on wide ones-->
          <div class="order-1 lg:order-2 px-4 pb-4 lg:p-0 lg:max-w-[300px] 2xl:max-w-[350px]">
            <p class="text-xl font-bold text-heading-light dark:text-heading-dark">
            What are <DISCOllaboratives />?</p>
            <p class="mt-4">
              <DISCOllaboratives /> are machine learning tasks, such as diagnosing COVID from ultrasounds or classifying hand written digits, that you can join to train and contribute to with your own data.
              To give you a sense of <DISCO />, we pre-defined some tasks along with some example datasets. 
              The end goal of <DISCO /> is for users to create their own custom <DISCOllaborative /> and collaboratively train machine learning models.<br>
              By participating in a task, you can either choose to train a model with your own data only or join a collaborative training session with other users.
              If you want to bring your own collaborative task into <DISCO />, you can do so by creating <button
                class="text-blue-400 text-left"
                @click="goToCreateTask()"
              >a new <DISCOllaborative />.</button>
              <br/><br/> <b>The data you connect is only used locally and is never uploaded or shared with anyone. Data always stays on your device.</b>
            </p>
          </div>
          <div
            v-if="sortedTasks === 'loading'"
            class="order-2 lg:order-1 my-10 flex flex-col justify-center items-center w-[700px]"
          >
            <VueSpinner size="50" color="#6096BA"/>
            <div class="mt-10 flex flex-col justify-center items-center">
              <p class="text-disco-blue">Loading <DISCOllaboratives /></p>
              <p class="text-disco-blue text-xs">This can take a few seconds</p>
            </div>
          </div>
        
        <div 
          v-else
          id="tasks"
          class="order-2 lg:order-1 w-full max-w-[700px] flex flex-col gap-y-4 lg:px-8"
        >
            <div
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
                    <div>{{ task.displayInformation.title }}</div>
                    <div class="flex flex-row shrink-0 justify-end gap-1">
                      <div class="px-2 py-1 rounded-md flex items-center" :style="{ backgroundColor: getSchemeColor(task) }">
                        <div 
                          class="text-xs font-semibold text-slate-900"
                        >{{ task.trainingInformation.scheme.toUpperCase() }}</div>
                      </div>
                      <div class="px-2 py-1 rounded-md flex items-center" :style="{ backgroundColor: getDataTypeColor(task) }">
                        <div 
                          class="text-xs font-semibold text-slate-900"
                        >{{ task.dataType.toUpperCase() }}</div>
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
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { VueSpinner } from 'vue3-spinners';
import { List } from "immutable";

import { useTasksStore, useTrainingStore, useTutorialStore } from "@/store";

import type { DataType, Task } from "@epfml/discojs";
import ButtonsCard from '@/components/containers/ButtonsCard.vue'
import DISCO from '@/components/simple/DISCO.vue'
import DISCOllaborative from '@/components/simple/DISCOllaborative.vue'
import DISCOllaboratives from '@/components/simple/DISCOllaboratives.vue'

const router = useRouter()
const trainingStore = useTrainingStore()
const tutorialStore = useTutorialStore();
const { tasks } = storeToRefs(useTasksStore())

const sortedTasks = computed(() => {
  if (typeof tasks.value === "string") return tasks.value;
  return [...tasks.value.values()].sort((task1, task2) =>
    task1.displayInformation.title.localeCompare(
      task2.displayInformation.title,
    ),
  );
});

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
  switch (task.dataType) {
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

// Start the tutorial on mount if it has not already been seen
onMounted(() => { tutorialStore.startOnFirstVisit(); });

</script>
