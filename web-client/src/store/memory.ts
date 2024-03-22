import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

import { Map } from 'immutable'
import * as tf from '@tensorflow/tfjs'

import type { ModelInfo, Path } from '@epfml/discojs-core'
import { ModelType } from '@epfml/discojs-core'

interface ModelMetadata extends ModelInfo {
  date: string
  hours: string
  fileSize: number
}

export const useMemoryStore = defineStore('memory', () => {
  const models = shallowRef<Map<Path, ModelMetadata>>(Map())
  const useIndexedDB = ref(true)

  function setIndexedDB (use: boolean) {
    useIndexedDB.value = use
  }

  function addModel (path: Path, metadata: ModelMetadata) {
    models.value = models.value.set(path, metadata)
  }

  function deleteModel (path: Path) {
    models.value = models.value.delete(path)
  }

  async function initModels () {
    const models = await tf.io.listModels()
    for (const path in models) {
      // eslint-disable-next-line no-unused-vars
      const [location, _, directory, task, fullName] = path.split('/')
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

      addModel(path, {
        name,
        taskID: task,
        type: directory === 'working' ? ModelType.WORKING : ModelType.SAVED,
        date: dateSaved,
        hours: hourSaved,
        fileSize: Math.round(size / 1024),
        version: version !== undefined ? Number(version) : 0
      })
    }
  }

  return { models, useIndexedDB, initModels, addModel, deleteModel, setIndexedDB }
})
