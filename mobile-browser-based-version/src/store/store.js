import { createStore } from 'vuex';

export const store = createStore({
  state: {
    count: 0,
    globalTaskFrameState: new Array(),
    passwords: new Array(),
    tasks: new Array(),
    useIndexedDB: true,
    isDark: false,
    activePage: 'home',
  },
  mutations: {
    increment(state) {
      state.count++;
    },

    addGlobalTaskFrameState(state, newGlobalTaskFrameState) {
      let modelID = newGlobalTaskFrameState.modelID;
      state.globalTaskFrameState[modelID] = newGlobalTaskFrameState;
    },

    addPassword(state, payload) {
      state.passwords[payload.id] = payload.password;
    },

    addTask(state, payload) {
      state.tasks[payload.task.trainingInformation.modelID] = payload.task;
    },

    setIndexedDB(state, payload) {
      // Convert payload to boolean value
      state.useIndexedDB = payload ? true : false;
    },

    setAppTheme(state, payload) {
      state.isDark = payload ? true : false;
    },

    setActivePage(state, payload) {
      state.activePage = payload;
    },
  },

  getters: {
    globalTaskFrameState: (state) => (modelID) => {
      return state.globalTaskFrameState[modelID];
    },
    password: (state) => (taskID) => {
      return taskID in state.passwords ? state.passwords[taskID] : null;
    },
    tasks: (state) => (modelID) => {
      return state.tasks[modelID];
    },
  },
});

export default store;
