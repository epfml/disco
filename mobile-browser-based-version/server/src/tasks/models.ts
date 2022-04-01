import fs from 'fs'
import path from 'path'
import * as tf from '@tensorflow/tfjs-node'

import { CONFIG } from '../config'

/**
 * Create the models directory for the TFJS model files of
 * the tasks defined below.
 */
if (!fs.existsSync(CONFIG.modelsDir)) {
  fs.mkdirSync(CONFIG.modelsDir)
}

async function createTitanicModel () {
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
  const savePath = path.join(CONFIG.modelsDir, 'titanic')
  await model.save(CONFIG.savingScheme.concat(savePath))
}

async function createMnistModel () {
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
  const savePath = path.join(CONFIG.modelsDir, 'mnist')
  await model.save(CONFIG.savingScheme.concat(savePath))
}

async function createLUSCovidModel () {
  const model = tf.sequential()
  model.add(
    tf.layers.dense({ inputShape: [1000], units: 512, activation: 'relu' })
  )
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 2, activation: 'softmax' }))
  const savePath = path.join(CONFIG.modelsDir, 'lus_covid')
  await model.save(CONFIG.savingScheme.concat(savePath))
}

async function createCifar10Model () {
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

  const savePath = path.join(CONFIG.modelsDir, 'cifar10')
  await model.save(CONFIG.savingScheme.concat(savePath))
}

export default [
  createTitanicModel,
  createMnistModel,
  createLUSCovidModel,
  createCifar10Model
]
