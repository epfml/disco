import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { Map } from 'immutable'

import { TaskID } from 'discojs'

export const useTrainingStore = defineStore('training', () => {
  const steps = shallowRef<Map<TaskID, number>>(Map())
  const task = ref<TaskID>(undefined)

  const step = computed(() => steps.value.get(task.value))

  function setTask (taskID: TaskID): void {
    task.value = taskID
  }
  function prevStep (): void {
    const step = steps.value.get(task.value)
    if (step === undefined || step < 1) {
      throw new Error()
    }
    steps.value = steps.value.set(task.value, step - 1)
  }
  function nextStep (): void {
    const step = steps.value.get(task.value)
    if (step === undefined) {
      throw new Error()
    }
    steps.value = steps.value.set(task.value, step + 1)
  }
  function setStep (step: number): void {
    if (step < 1) {
      throw new Error()
    }
    steps.value = steps.value.set(task.value, step)
  }

  return { steps, task, step, setTask, prevStep, nextStep, setStep }
})
