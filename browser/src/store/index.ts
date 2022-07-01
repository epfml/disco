import { loadTasks } from '@/tasks'

import { ModelType, Task } from 'discojs'
import { ActionContext, createStore } from 'vuex'
import * as tf from '@tensorflow/tfjs'

const MIN_STEP = 0
const MAX_STEP = 4

interface State {
  tasks: Map<string, Task>,
  steps: Map<string, number>,
  models: Map<string, any>,
  currentTask: string,
  useIndexedDB: boolean,
  isDark: boolean,
  testingModel: string
}

export const store = createStore({
  state (): State {
    return {
      tasks: new Map(),
      steps: new Map(),
      models: new Map(),
      currentTask: undefined,
      useIndexedDB: true,
      isDark: false,
      testingModel: undefined
    }
  },
  actions: {
    async initTasks (context: ActionContext<State, State>) {
      try {
        const tasks = await loadTasks()
        tasks.forEach(task => context.commit('addTask', task))
      } catch (e) {
        console.log('Fetching of tasks failed.')
      }
    },
    async initModels (context: ActionContext<State, State>) {
      const models = await tf.io.listModels()
      for (const path in models) {
        // eslint-disable-next-line no-unused-vars
        const [location, _, directory, task, name] = path.split('/')
        if (location !== 'indexeddb:') {
          continue
        }

        const metadata = models[path]
        const date = new Date(metadata.dateSaved)
        const zeroPad = (number: number) => String(number).padStart(2, '0')
        const dateSaved = [
          date.getDate(),
          date.getMonth() + 1,
          date.getFullYear()
        ]
          .map(zeroPad)
          .join('/')
        const hourSaved = [date.getHours(), date.getMinutes()]
          .map(zeroPad)
          .join('h')
        const size =
          metadata.modelTopologyBytes +
          metadata.weightSpecsBytes +
          metadata.weightDataBytes

        context.commit('addModel',
          {
            path: path,
            metadata: {
              name: name,
              taskID: task,
              modelType: directory === 'working' ? ModelType.WORKING : ModelType.SAVED,
              date: dateSaved,
              hours: hourSaved,
              fileSize: Math.round(size / 1024)
            }
          })
      }
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
    addModel (state: State, { path, metadata }: { path: string, metadata: any }): void {
      state.models.set(path, metadata)
    },
    deleteModel (state: State, path: string): void {
      state.models.delete(path)
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
    },
    setTestingModel (state: State, path: string): void {
      state.testingModel = path
    }
  }
})

export default store
