import { loadTasks } from '@/tasks'

import { tf, ModelType, Path, Task, TaskID } from 'discojs'
import { InjectionKey } from 'vue'
import { ActionContext, createStore, useStore as baseUseStore, Store } from 'vuex'

const MIN_STEP = 0
const MAX_STEP = 4

// TODO better typing
type ModelMetadata = any

export interface State {
  tasks: Map<TaskID, Task>,
  steps: Map<TaskID, number>,
  models: Map<Path, ModelMetadata>,
  currentTask: TaskID,
  useIndexedDB: boolean,
  isDark: boolean,
  testingModel: Path
  testingState: boolean
}

// eslint-disable-next-line symbol-description
export const key: InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state (): State {
    return {
      tasks: new Map(),
      steps: new Map(),
      models: new Map(),
      currentTask: undefined,
      useIndexedDB: true,
      isDark: false,
      testingModel: undefined,
      testingState: false
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
    addModel (state: State, { path, metadata }: { path: Path, metadata: ModelMetadata }): void {
      state.models.set(path, metadata)
    },
    deleteModel (state: State, path: Path): void {
      state.models.delete(path)
    },
    prevStep (state: State, taskID: TaskID): void {
      if (state.steps.has(taskID)) {
        const step = state.steps.get(taskID)
        if (step !== undefined) {
          state.steps.set(taskID, Math.max(MIN_STEP, step - 1))
        }
      }
    },
    nextStep (state: State, taskID: TaskID): void {
      if (state.steps.has(taskID)) {
        const step = state.steps.get(taskID)
        if (step !== undefined) {
          state.steps.set(taskID, Math.min(MAX_STEP, step + 1))
        }
      }
    },
    setStep (state: State, { taskID, step }: { taskID: TaskID, step: number }) {
      if (step >= MIN_STEP && step <= MAX_STEP && state.steps.has(taskID)) {
        state.steps.set(taskID, step)
      }
    },
    setCurrentTask (state: State, taskID: TaskID): void {
      if (state.tasks.has(taskID)) {
        state.currentTask = taskID
      }
    },
    setTestingModel (state: State, path: Path): void {
      state.testingModel = path
      state.testingState = !state.testingState // trigger event-like update
    }
  }
})

export function useStore (): Store<State> {
  return baseUseStore(key)
}
