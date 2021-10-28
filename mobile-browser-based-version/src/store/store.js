import { createStore } from 'vuex';
import { TrainingManager } from '../helpers/training_script/training_manager'; //"../../helpers/training_script/training_manager";
import _ from 'lodash';
export const store = createStore({
  state: {
    count: 0,
    globalTaskFrameState: {},
    passwords: {},
    tasks: {},     // Vue components
    JSONTasks: [],  // Json object
    lastJSONTaskAdded: {},
  },
  mutations: {
    increment(state) {
      state.count++;
    },

    async addGlobalTaskFrameState(state, newGlobalTaskFrameState) {
      let modelId = newGlobalTaskFrameState.modelId;
      state.globalTaskFrameState[modelId] = newGlobalTaskFrameState;
    },

    async addPassword(state, payload) {
      state.passwords[payload.id] = payload.password;
    },

    async addTask(state, payload) {
      state.tasks[payload.task.trainingInformation.modelId] = payload.task;
    },

    async addJSONTask(state, payload) {
      state.JSONTasks.push(payload.task);
      state.lastJSONTaskAdded = payload.task;
    },
  },

  getters: {
    trainingManagers: state => {
      return state.trainingManagers;
    },
    globalTaskFrameState: state => modelId => {
      return state.globalTaskFrameState[modelId];
    },
    password: state => taskId => {
      return taskId in state.passwords ? state.passwords[taskId] : null;
    },
    tasks: state => modelId => {
      return state.tasks[modelId];
    },
    tasksList: state => {
      return _.values(state.tasks);
    },
    lastJSONTaskAdded: state => {
      return state.lastJSONTaskAdded;
    }
  },
});

export default store;
