import { defineStore } from 'pinia'
import { shallowRef, ref, computed } from 'vue'
import { Map } from 'immutable'

import type { TaskID, Task } from '@epfml/discojs'
import { fetchTasks } from '@epfml/discojs'

import { useToaster } from '@/composables/toaster'
import { CONFIG } from '@/config'
import { useTrainingStore } from './training'

export const useTasksStore = defineStore('tasks', () => {
  const trainingStore = useTrainingStore()

  const tasks = shallowRef<Map<TaskID, Task>>(Map())
  
  // 3-state variable used to test whether the tasks have been retrieved successfully,
  // if the retrieving failed, or if they are currently being loaded
  const status = ref<'success' | 'failed' | 'loading'>('loading')

  function addTask (task: Task): void {
    trainingStore.setTask(task.id);
    trainingStore.setStep(0);
    tasks.value = tasks.value.set(task.id, task)
  }

  const TASKS_TO_FILTER_OUT = ['simple_face', 'cifar10']

  async function initTasks (): Promise<void> {
    try {
      status.value = 'loading'
      await new Promise((res, _) => setTimeout(res, 5000))
      const tasks = (await fetchTasks(CONFIG.serverUrl)).filter((t: Task) => !TASKS_TO_FILTER_OUT.includes(t.id))

      tasks.forEach(addTask)
      status.value = 'success'
    } catch (e) {
      console.error('Fetching of tasks failed with error', e instanceof Error ? e.message : e)

      //Only display UI message once
      if (status.value !== 'failed') {
        const toaster = useToaster()
        toaster.error('The server is unreachable.\nPlease try again later or reach out on slack.')
        status.value = 'failed'
      }
    }
  }

  return { tasks, initTasks, addTask, status }
})
