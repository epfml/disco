import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { Map } from 'immutable'

import type { TaskID } from '@epfml/discojs-core'

export const useTrainingStore = defineStore('training', () => {
  const steps = shallowRef<Map<TaskID, number>>(Map())
  const task = ref<TaskID>()

  const step = computed(() => {
    const id = task.value
    if (id === undefined) return undefined
    const t = steps.value.get(id)
    if (t === undefined) throw new Error("id doesn't match any task")
    return t
  })

  function setTask (id: TaskID): void {
    task.value = id
  }
  function setStep (step: number): void {
    if (step < 0) throw new Error('step must be positive')
    const id = task.value
    if (id === undefined) throw new Error('task is not initialized')
    steps.value = steps.value.set(id, step)
  }

  function prevStep (): void {
    const s = step.value
    if (s === undefined) throw new Error('current step is undefined')
    setStep(s - 1)
  }
  function nextStep (): void {
    const s = step.value
    if (s === undefined) throw new Error('current step is undefined')
    setStep(s + 1)
  }

  return { task, step, setTask, prevStep, nextStep, setStep }
})
