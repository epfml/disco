import { loadTasks } from '@/tasks'

import { Task } from 'discojs'
import { ActionContext, createStore } from 'vuex'

const MIN_STEP = 0
const MAX_STEP = 4

interface State {
  tasks: Map<string, Task>,
  steps: Map<string, number>,
  currentTask: string,
  useIndexedDB: boolean,
  isDark: boolean
}

export const store = createStore({
  state (): State {
    return {
      tasks: new Map<string, Task>(),
      steps: new Map<string, number>(),
      currentTask: '',
      useIndexedDB: true,
      isDark: false
    }
  },
  actions: {
    async initTasks (context: ActionContext<State, State>) {
      const tasks = await loadTasks()
      tasks.forEach(task => context.commit('addTask', task))
    }
  },
  mutations: {
    setIndexedDB (state: State, use: boolean): void {
      state.useIndexedDB = use
    },
    setAppTheme (state: State, theme: boolean): void {
      state.isDark = theme
    },
    addTask (state: State, task: Task): void {
      state.tasks.set(task.taskID, task)
      state.steps.set(task.taskID, 0)
    },
    prevStep (state: State, taskID: string): void {
      if (state.steps.has(taskID)) {
        const step = state.steps.get(taskID)
        if (step !== undefined) {
          state.steps.set(taskID, Math.max(MIN_STEP, step - 1))
        }
      }
    },
    nextStep (state: State, taskID: string): void {
      if (state.steps.has(taskID)) {
        const step = state.steps.get(taskID)
        if (step !== undefined) {
          state.steps.set(taskID, Math.min(MAX_STEP, step + 1))
        }
      }
    },
    setStep (state: State, { taskID, step }: { taskID: string, step: number }) {
      if (step >= MIN_STEP && step <= MAX_STEP && state.steps.has(taskID)) {
        state.steps.set(taskID, step)
      }
    },
    setCurrentTask (state: State, taskID: string): void {
      if (state.tasks.has(taskID)) {
        state.currentTask = taskID
      }
    }
  }
})

export default store
