import { createStore } from 'vuex'
import { Platform } from '../platforms/platform'

export const store = createStore({
  state: {
    count: 0,
    globalTaskFrameState: {},
    passwords: {},
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

    password: (state) => (taskID: string) =>
      taskID in state.passwords ? state.passwords[taskID] : '',

    platform: (state) => state.platform,

    isDecentralized: (state) => state.platform === Platform.decentralized,

    isFederated: (state) => state.platform === Platform.federated
  }
})

export default store
