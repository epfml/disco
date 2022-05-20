import fs from 'fs/promises'
import * as tf from '@tensorflow/tfjs-node'

import { Path, TaskID } from 'discojs'

import { CONFIG } from '../config'
import { faceModel } from './face_model'

// Compute model directory path and create it.
async function getTaskDir (taskID: TaskID): Promise<Path> {
  const dir = CONFIG.modelDir(taskID)

  await fs.mkdir(dir, { recursive: true })

  return dir
}

// Remove model from memory
function dispose (model: tf.LayersModel): void {
  model.layers.forEach(l => l.dispose())
}

async function createTitanicModel (): Promise<void> {
  const model = tf.sequential()
  model.add(
    tf.layers.dense({
      inputShape: [6],
      units: 124,
      activation: 'relu',
      kernelInitializer: 'leCunNormal'
    })
  )
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }))

  const savePath = await getTaskDir('titanic')
  await model.save(CONFIG.savingScheme.concat(savePath))
  dispose(model)
}

async function createMnistModel (): Promise<void> {
  const model = tf.sequential()
  model.add(
    tf.layers.conv2d({
      inputShape: [28, 28, 3],
      kernelSize: 3,
      filters: 16,
      activation: 'relu'
    })
  )
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }))
  model.add(
    tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' })
  )
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }))
  model.add(
    tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' })
  )
  model.add(tf.layers.flatten({}))
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 10, activation: 'softmax' }))

  const savePath = await getTaskDir('mnist')
  await model.save(CONFIG.savingScheme.concat(savePath))
  dispose(model)
}

async function createLUSCovidModel (): Promise<void> {
  const model = tf.sequential()
  model.add(
    tf.layers.dense({ inputShape: [1000], units: 512, activation: 'relu' })
  )
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 2, activation: 'softmax' }))

  const savePath = await getTaskDir('lus_covid')
  await model.save(CONFIG.savingScheme.concat(savePath))
  dispose(model)
}

async function createCifar10Model (): Promise<void> {
  const mobilenet = await tf.loadLayersModel(
    'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
  )
  const x = mobilenet.getLayer('global_average_pooling2d_1')
  const predictions = tf.layers
    .dense({ units: 10, activation: 'softmax', name: 'denseModified' })
    .apply(x.output) as tf.SymbolicTensor
  const model = tf.model({
    inputs: mobilenet.input,
    outputs: predictions,
    name: 'modelModified'
  })

  const savePath = await getTaskDir('cifar10')
  await model.save(CONFIG.savingScheme.concat(savePath))
  dispose(model)
}

async function createFaceModel (): Promise<void> {
  const model = faceModel()

  const savePath = await getTaskDir('simple_face')
  await model.save(CONFIG.savingScheme.concat(savePath))
  dispose(model)
}

export default [
  createTitanicModel,
  createMnistModel,
  createLUSCovidModel,
  createCifar10Model,
  createFaceModel
]
