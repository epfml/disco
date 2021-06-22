import {createStore} from 'vuex'
import { TrainingManager } from "../helpers/training_script/training_manager"//"../../helpers/training_script/training_manager";


export const store = createStore({
    state: {
      count: 0, 
      globalTaskFrameState: new Array()
    },
    mutations: {
      increment (state) {
        state.count++
      }, 

      async addGlobalTaskFrameState(state, newGlobalTaskFrameState) {
        let modelId = newGlobalTaskFrameState.modelId
        state.globalTaskFrameState[modelId] = newGlobalTaskFrameState
      }
    },

    getters: {
        trainingManagers: state => {
          return state.trainingManagers;
        }, 
        globalTaskFrameState: (state) => (modelId) => {
          return state.globalTaskFrameState[modelId]
        }
      }
  })