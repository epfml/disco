import { defineStore } from 'pinia'
import { ref } from 'vue'

import { Path } from 'discojs'

export const useValidationStore = defineStore('validation', () => {
  const state = ref(false)
  const model = ref<Path>(undefined)

  function setModel (path: Path) {
    model.value = path
    state.value = !state.value
  }
  return { state, model, setModel }
})
