import * as tf from '@tensorflow/tfjs'

import { Task } from '../task'

export const task: Task = {
  taskID: 'simple_face',
  displayInformation: {
    taskTitle: 'Simple Face',
    summary: {
      preview: 'Can you detect if the person in a picture is a child or an adult?',
      overview: 'Simple face is a small subset of face_task from Kaggle'
    },
    limitations: 'The training data is limited to small images of size 200x200.',
    tradeoffs: 'Training success strongly depends on label distribution',
    dataFormatInformation: '',
    dataExampleText: 'Below you find an example',
    dataExampleImage: './simple_face-example.png'
  },
  trainingInformation: {
    modelID: 'simple_face-model',
    epochs: 50,
    roundDuration: 1,
    validationSplit: 0.2,
    batchSize: 5,
    preprocessFunctions: [],
    learningRate: 0.001,
    modelCompileData: {
      optimizer: 'sgd',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    },
    dataType: 'image',
    csvLabels: false,
    IMAGE_H: 200,
    IMAGE_W: 200,
    LABEL_LIST: ['child', 'adult'],
    scheme: 'Federated'
  }
}

function addMobilenetBlock (model: tf.Sequential, filters: number, strides: number): void {
  model.add(tf.layers.depthwiseConv2d({
    kernelSize: 3,
    strides: strides,
    padding: 'same'
  }))

  model.add(tf.layers.batchNormalization())
  model.add(tf.layers.reLU())

  model.add(tf.layers.conv2d({
    filters: filters,
    kernelSize: 1,
    strides: 1
  }))

  model.add(tf.layers.batchNormalization())
  model.add(tf.layers.reLU())
}

function mobilenetv2 (height = 224, width = 224, channels = 3, numberOfClasses = 10): tf.Sequential {
  const model = tf.sequential()

  // stem of the model
  model.add(tf.layers.conv2d({
    inputShape: [height, width, channels],
    filters: 32,
    kernelSize: 3,
    strides: 2,
    padding: 'same'
  }))

  model.add(tf.layers.batchNormalization())
  model.add(tf.layers.reLU())

  // main part of the model
  addMobilenetBlock(model, 64, 1)
  addMobilenetBlock(model, 128, 2)
  addMobilenetBlock(model, 128, 1)
  addMobilenetBlock(model, 256, 2)
  addMobilenetBlock(model, 256, 1)
  addMobilenetBlock(model, 512, 2)

  addMobilenetBlock(model, 512, 1)
  addMobilenetBlock(model, 512, 1)
  addMobilenetBlock(model, 512, 1)
  addMobilenetBlock(model, 512, 1)
  addMobilenetBlock(model, 512, 1)

  addMobilenetBlock(model, 1024, 2)
  addMobilenetBlock(model, 1024, 1)

  model.add(tf.layers.averagePooling2d({
    poolSize: 7,
    strides: 1,
    dataFormat: 'channelsFirst'
  }))

  model.add(tf.layers.dense({
    units: numberOfClasses,
    activation: 'softmax'
  }))

  return model
}

export function model (imageHeight = 200, imageWidth = 200, imageChannels = 3, numOutputClasses = 2): tf.LayersModel {
  return mobilenetv2(imageHeight, imageWidth, imageChannels, numOutputClasses)
}
