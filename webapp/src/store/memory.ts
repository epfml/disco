import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

import { Map } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { ModelInfo } from '@epfml/discojs'

export interface ModelMetadata extends ModelInfo {
  date: string
  hours: string
  fileSize: number
}

export const useMemoryStore = defineStore('memory', () => {
  const models = shallowRef<Map<string, ModelMetadata>>(Map())
  const useIndexedDB = ref(true)

  function setIndexedDB (use: boolean) {
    useIndexedDB.value = use
  }

  function addModel (id: string, metadata: ModelMetadata) {
    models.value = models.value.set(id, metadata)
  }

  function deleteModel (id: string) {
    models.value = models.value.delete(id)
  }

  async function initModels () {
    const models = await tf.io.listModels()
    for (const path in models) {
      const [location, _, directory, tensorBackend, task, fullName] = path.split('/')
      if (location !== 'indexeddb:') {
        continue
      }
      const [name, version] = fullName.split('@')
      const metadata = models[path]
      const date = new Date(metadata.dateSaved)
      const zeroPad = (number: number) => String(number).padStart(2, '0')
      const dateSaved = [
        date.getDate(),
        date.getMonth() + 1,
        date.getFullYear()
      ]
        .map(zeroPad)
        .join('/')
      const hourSaved = [date.getHours(), date.getMinutes()]
        .map(zeroPad)
        .join('h')
      const size = [
        metadata.modelTopologyBytes,
        metadata.weightSpecsBytes,
        metadata.weightDataBytes,
      ].reduce((acc: number, v) => acc + (v === undefined ? 0 : v), 0)

      if (tensorBackend !== 'tfjs' && tensorBackend !== 'gpt') {
        throw new Error("Tensor backend unrecognized: " + tensorBackend)
      }
      addModel(path, {
        name,
        tensorBackend,
        taskID: task,
        type: directory !== 'working' ? 'saved' : 'working',
        date: dateSaved,
        hours: hourSaved,
        fileSize: Math.round(size / 1024),
        version: version !== undefined ? Number(version) : 0
      })
    }
  }

  return { models, useIndexedDB, initModels, addModel, deleteModel, setIndexedDB }
})
