import { createStore } from 'vuex'
import _ from 'lodash'
export const store = createStore({
  state: {
    count: 0,
    globalTaskFrameState: {},
    passwords: {},
    tasksFrames: {}, // vue components
    newTasks: [], // buffer containing
    useIndexedDB: true,
    isDark: false,
    activePage: 'home'
  },
  mutations: {
    increment (state) {
      state.count++
    },

    addGlobalTaskFrameState (state, newGlobalTaskFrameState) {
      const modelID = newGlobalTaskFrameState.modelID
      state.globalTaskFrameState[modelID] = newGlobalTaskFrameState
    },

    addPassword (state, payload) {
      state.passwords[payload.id] = payload.password
    },

    addTaskFrame (state, payload) {
      state.tasksFrames[payload.trainingInformation.modelID] = payload
    },

    addNewTask (state, payload) {
      // need to update the reference o.w. it doesn't work
      state.newTasks = _.concat(state.newTasks, payload)
    },

    clearNewTasks (state) {
      // limit the number of update events generated if no new tasks have been added
      state.newTasks = []
    },

    setIndexedDB (state, payload) {
      // Convert payload to boolean value
      state.useIndexedDB = !!payload
    },

    setAppTheme (state, payload) {
      state.isDark = !!payload
    },

    setActivePage (state, payload) {
      state.activePage = payload
    }
  },

  getters: {
    globalTaskFrameState: (state) => (modelID) =>
      state.globalTaskFrameState[modelID],
    password: (state) => (taskID) =>
      taskID in state.passwords ? state.passwords[taskID] : '',
    taskFrame: (state) => (modelID) => state.tasksFrames[modelID],
    tasksFramesList: (state) => _.values(state.tasksFrames)
  }
})

export default store
