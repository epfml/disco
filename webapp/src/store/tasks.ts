import { defineStore } from 'pinia'
import { shallowRef, ref } from 'vue'
import { Map } from 'immutable'

import type { TaskID, Task } from '@epfml/discojs'
import { fetchTasks } from '@epfml/discojs'

import { useToaster } from '@/composables/toaster'
import { CONFIG } from '@/config'
import { useTrainingStore } from './training'

export const useTasksStore = defineStore('tasks', () => {
  const trainingStore = useTrainingStore()

  const tasks = shallowRef<Map<TaskID, Task>>(Map())
  
  // used to display loading indicator in the webapp when loading tasks
  const loading = ref(false)
  // used to not display duplicate toaster messages
  const loadingAlreadyFailed = ref(false)

  function addTask (task: Task): void {
    trainingStore.setTask(task.id);
    trainingStore.setStep(0);
    tasks.value = tasks.value.set(task.id, task)
  }

  const TASKS_TO_FILTER_OUT = ['simple_face', 'cifar10']

  async function initTasks (): Promise<void> {
    try {
      loading.value = true
      const tasks = (await fetchTasks(CONFIG.serverUrl)).filter((t: Task) => !TASKS_TO_FILTER_OUT.includes(t.id))

      tasks.forEach(addTask)
      loadingAlreadyFailed.value = false
    } catch (e) {
      console.error('Fetching of tasks failed with error', e instanceof Error ? e.message : e)

      //Only display UI message once
      if (!loadingAlreadyFailed.value) {
        const toaster = useToaster()
        toaster.error('The server is unreachable.\nPlease try again later or reach out on slack.')
        loadingAlreadyFailed.value = true
      }
    } finally {
      loading.value = false
    }
  }

  return { tasks, initTasks, addTask, loading, loadingAlreadyFailed }
})
