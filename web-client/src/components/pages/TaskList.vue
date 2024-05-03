<template>
  <div class="space-y-8 mt-8 md:mt-16">
    <div class="flex flex-col gap-8 mt-8">
      <!-- In case no tasks were retrieved, suggest reloading the page -->
      <ButtonCard
        v-show="tasks.size === 0"
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
      >
        <div
          v-for="task in sortedTasks"
          v-show="sortedTasks.length > 0"
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
              <div v-html="task.displayInformation.summary.preview"/>
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

import type { Task } from '@epfml/discojs-core'

import { useTasksStore } from '@/store/tasks'
import { useTrainingStore } from '@/store/training'
import ButtonCard from '@/components/containers/ButtonCard.vue'

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

</script>
