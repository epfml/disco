import { createStore } from 'vuex'
import _ from 'lodash'
import { Platform } from '../platforms/platform'
export const store = createStore({
  state: {
    count: 0,
    globalTaskFrameState: {},
    passwords: {},
    tasksFrames: {}, // vue components
    newTasks: [], // buffer containing
    useIndexedDB: true,
    isDark: false,
    platform: Platform.decentralized,
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

    setPlatform (state, platform) {
      state.platform = platform
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
    tasksFramesList: (state) => _.values(state.tasksFrames),
    platform: (state) => state.platform,
    isDecentralized: (state) => state.platform === Platform.decentralized,
    isFederated: (state) => state.platform === Platform.federated
  }
})

export default store
