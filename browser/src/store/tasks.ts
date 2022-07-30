import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import { Map } from 'immutable'

import { Task, TaskID } from 'discojs'

import { loadTasks } from '@/tasks'
import { useTrainingStore } from './training'

export const useTasksStore = defineStore('tasks', () => {
  const trainingStore = useTrainingStore()

  const tasks = shallowRef<Map<TaskID, Task>>(Map())

  function addTask (task: Task) {
    trainingStore.steps = trainingStore.steps.set(task.taskID, 0)
    tasks.value = tasks.value.set(task.taskID, task)
  }

  async function initTasks () {
    try {
      const tasks = await loadTasks()
      tasks.forEach(task => addTask(task))
    } catch (e) {
      console.log('Fetching of tasks failed.')
    }
  }

  return { tasks, initTasks, addTask }
})
