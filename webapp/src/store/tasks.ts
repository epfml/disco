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
  
  // used to display loading indicator in the webapp when loading tasks
  const loading = ref(false)
  // when loading is finished but failed
  // used to not display duplicate toaster messages
  const loadingFailed = ref(false)
  // condition used to check if tasksStore is ready
  const loadedSuccessfully =  computed(()=> !loading.value && !loadingFailed.value)


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
      loadingFailed.value = false
    } catch (e) {
      console.error('Fetching of tasks failed with error', e instanceof Error ? e.message : e)

      //Only display UI message once
      if (!loadingFailed.value) {
        const toaster = useToaster()
        toaster.error('The server is unreachable.\nPlease try again later or reach out on slack.')
        loadingFailed.value = true
      }
    } finally {
      loading.value = false
    }
  }

  return { tasks, initTasks, addTask, loading, loadingFailed, loadedSuccessfully }
})
