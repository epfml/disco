import { createStore } from 'vuex';
import _ from "lodash";
export const store = createStore({
  state: {
    count: 0,
    globalTaskFrameState: {},
    passwords: {},
    tasksFrames: {}, // vue components
    newTasksBuf: [], // buffer containing
    useIndexedDB: true,
    isDark: false,
    isDecentralized: true,
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

    addTaskFrame(state, payload) {
      state.tasks[payload.task.trainingInformation.modelID] = payload.task;
    },

    newTask(state, payload) {
      //need to update the reference o.w. it doesn't work
      state.newTasksBuf = _.concat(state.newTasksBuf,payload);
    },

    clearNewTasks(state) {
      // limit the number of update events generated if no new tasks have been added
      state.newTasksBuf.length > 0 ? state.newTasksBuf = []: undefined;
    },

    setIndexedDB(state, payload) {
      // Convert payload to boolean value
      state.useIndexedDB = payload ? true : false;
    },

    setAppTheme(state, payload) {
      state.isDark = payload ? true : false;
    },

    setPlatform(state, payload) {
      state.isDecentralized = payload ? true : false;
    },

    setActivePage(state, payload) {
      state.activePage = payload;
    },
  },

  getters: {
    globalTaskFrameState: (state) => (modelID) =>
      state.globalTaskFrameState[modelID],
    password: (state) => (taskID) =>
      taskID in state.passwords ? state.passwords[taskID] : null,
    taskFrame: (state) => (modelID) => state.tasksFrames[modelID],
    newTasks: (state) => state.newTasksBuf,
    tasksFramesList: (state) => _.values(state.tasksFrames),
    platform: (state) => (state.isDecentralized ? 'deai' : 'feai')
  },
});

export default store;
