import { createStore } from 'vuex'

export const store = createStore({
  state: {
    count: 0,
    globalTaskFrameState: {},
    passwords: {},
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

    password: (state) => (taskID: string) =>
      taskID in state.passwords ? state.passwords[taskID] : ''
    // taskFrame: (state) => (modelID) => state.tasksFrames[modelID],
    // tasksFramesList: (state) => _.values(state.tasksFrames)
  }
})

export default store
