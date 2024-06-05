import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useValidationStore = defineStore('validation', () => {
  const state = ref(false)
  const step = ref(0)
  const model = ref<string>()
  const isOnlyPrediction = ref(false)

  const setModel = (id: string): void => {
    model.value = id
    state.value = !state.value
  }
  return { state, step, model, isOnlyPrediction, setModel }
})
