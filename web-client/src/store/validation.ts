import { defineStore } from 'pinia'
import { ref } from 'vue'

import { Path } from '@epfml/discojs-core'

export const useValidationStore = defineStore('validation', () => {
  const state = ref(false)
  const step = ref(0)
  const model = ref<Path>(undefined)
  const isOnlyPrediction = ref(false)

  const setModel = (path: Path): void => {
    model.value = path
    state.value = !state.value
  }
  return { state, step, model, isOnlyPrediction, setModel }
})
