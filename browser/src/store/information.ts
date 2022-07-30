import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useInformationStore = defineStore('information', () => {
  const step = ref(0)

  const nextStep = () => { step.value++ }
  const prevStep = () => {
    if (step.value <= 0) {
      throw new Error('step must be positive')
    } else {
      step.value--
    }
  }

  return { step, nextStep, prevStep }
})
