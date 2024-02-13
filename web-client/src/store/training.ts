import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { Map } from 'immutable'

import { TaskID } from '@epfml/discojs-core'

export const useTrainingStore = defineStore('training', () => {
  const steps = shallowRef<Map<TaskID, number>>(Map())
  const task = ref<TaskID>(undefined)

  const step = computed(() => steps.value.get(task.value))

  function setTask (id: TaskID): void {
    task.value = id
  }
  function prevStep (): void {
    const step = steps.value.get(task.value)
    if (step === undefined || step <= 0) {
      throw new Error('step must be positive')
    }
    steps.value = steps.value.set(task.value, step - 1)
  }
  function nextStep (): void {
    const step = steps.value.get(task.value)
    if (step === undefined) {
      throw new Error('task is not initialized')
    }
    steps.value = steps.value.set(task.value, step + 1)
  }
  function setStep (step: number): void {
    if (step < 0) {
      throw new Error('task must be positive')
    }
    steps.value = steps.value.set(task.value, step)
  }

  return { steps, task, step, setTask, prevStep, nextStep, setStep }
})
