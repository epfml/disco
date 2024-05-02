import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import { Map } from 'immutable'

import type { TaskID, Task } from '@epfml/discojs'
import { fetchTasks } from '@epfml/discojs'

import { useToaster } from '@/composables/toaster'
import { CONFIG } from '@/config'
import { useTrainingStore } from './training'

export const useTasksStore = defineStore('tasks', () => {
  const trainingStore = useTrainingStore()

  const tasks = shallowRef<Map<TaskID, Task>>(Map())

  function addTask (task: Task): void {
    trainingStore.setTask(task.id);
    trainingStore.setStep(0);
    tasks.value = tasks.value.set(task.id, task)
  }

  async function initTasks (): Promise<void> {
    try {
      const tasks = await fetchTasks(CONFIG.serverUrl)
      tasks.forEach(addTask)
    } catch (e) {
      console.error('Fetching of tasks failed with error', e instanceof Error ? e.message : e)
      const toaster = useToaster()
      toaster.error('The server is unreachable. \n Please try again later or reach out on slack.')
    }
  }

  return { tasks, initTasks, addTask }
})
