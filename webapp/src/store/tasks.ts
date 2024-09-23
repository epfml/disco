import createDebug from "debug";
import { defineStore } from 'pinia'
import { shallowRef, ref } from 'vue'
import { Map } from 'immutable'

import type { TaskID, Task, DataType } from "@epfml/discojs";
import { fetchTasks } from '@epfml/discojs'

import { useToaster } from '@/composables/toaster'
import { CONFIG } from '@/config'
import { useTrainingStore } from './training'

const debug = createDebug("webapp:store");

export const useTasksStore = defineStore('tasks', () => {
  const trainingStore = useTrainingStore()

  const tasks = shallowRef<Map<TaskID, Task<DataType>>>(Map())

  // 3-state variable used to test whether the tasks have been retrieved successfully,
  // if the retrieving failed, or if they are currently being loaded
  const status = ref<'success' | 'failed' | 'loading'>('loading')

  function addTask (task: Task<DataType>): void {
    trainingStore.setTask(task.id);
    trainingStore.setStep(0);
    tasks.value = tasks.value.set(task.id, task)
  }

  const TASKS_TO_FILTER_OUT = ['simple_face', 'cifar10']

  async function initTasks (): Promise<void> {
    try {
      status.value = 'loading'
      const tasks = (await fetchTasks(CONFIG.serverUrl)).filter(
        (t: Task<DataType>) => !TASKS_TO_FILTER_OUT.includes(t.id),
      );

      tasks.forEach(addTask)
      status.value = 'success'
    } catch (e) {
      debug("while fetching tasks: %o", e);

      //Only display UI message once
      if (status.value !== 'failed') {
        const toaster = useToaster()
        toaster.error('The server is unreachable. Please try again later.')
        status.value = 'failed'
      }
    }
  }

  return { tasks, initTasks, addTask, status }
})
