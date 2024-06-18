import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { Path } from '@epfml/discojs'

export type EvaluationType = 'predict' | 'test'

export const useValidationStore = defineStore('validation', () => {
  const state = ref(false)
  const step = ref(0)
  const model = ref<Path | undefined>(undefined)
  const evaluationType = ref<EvaluationType>()

  const setModel = (path: Path): void => {
    model.value = path
    state.value = !state.value
  }
  return { state, step, model, evaluationType, setModel }
})
