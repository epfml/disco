import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { data, models } from '../index.js'
import baseModel from '../models/mobileNet_v1_025_224.js'

const IMAGE_SIZE = 28

export const skinMnist: TaskProvider = {
  getTask (): Task {
    return {
      id: 'skin_mnist',
      displayInformation: {
        taskTitle: 'Skin Disease Classification',
        summary: {
          preview: 'Can you determine the skin disease from the dermatoscopic images?',
          overview: 'HAM10000 "Human Against Machine with 10000 training images" dataset is a large collection of multi-source dermatoscopic images of pigmented lesions from Kaggle'
        },
        dataFormatInformation: '',
        dataExampleText: 'Below you find an example',
        dataExampleImage: 'http://walidbn.com/ISIC_0024306.jpg'
      },
      trainingInformation: {
        modelID: 'skin-mnist-model',
        epochs: 50,
        roundDuration: 2,
        validationSplit: 0.2,
        batchSize: 5,
        preprocessingFunctions: [data.ImagePreprocessing.Resize, data.ImagePreprocessing.Normalize],
        dataType: 'image',
        IMAGE_H: IMAGE_SIZE,
        IMAGE_W: IMAGE_SIZE,
        LABEL_LIST: ['nv', 'vasc', 'mel', 'bkl', 'df', 'akiec', 'bcc'],
        scheme: 'federated',
        noiseScale: undefined,
        clippingRadius: undefined
      }
    }
  },

  async getModel(): Promise<Model> {
    const imageChannels = 3
    const numOutputClasses = 7
    // const mobilenet = await tf.loadLayersModel({
    //   load: async () => Promise.resolve(baseModel),
    // })

    // const x = mobilenet.getLayer('global_average_pooling2d_1')
    // const predictions = tf.layers
    //   .dense({ units: 10, activation: 'softmax', name: 'denseModified' })
    //   .apply(x.output) as tf.SymbolicTensor

    // const model = tf.model({
    //   inputs: mobilenet.input,
    //   outputs: predictions,
    //   name: 'modelModified'
    // })

    const model = tf.sequential()


    model.add(
      tf.layers.conv2d({
        inputShape: [IMAGE_SIZE, IMAGE_SIZE, imageChannels],
        filters: 256,
        kernelSize: 3,
        strides: 1,
        kernelInitializer: 'varianceScaling',
        activation: 'relu'
      })
    )

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }))
    model.add(tf.layers.dropout({ rate: 0.2 }))

    model.add(
      tf.layers.conv2d({
        filters: 128,
        kernelSize: 3,
        strides: 1,
        kernelInitializer: 'varianceScaling',
        activation: 'relu'
      })
    )

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }))
    model.add(tf.layers.dropout({ rate: 0.2 }))

    model.add(
      tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        strides: 1,
        kernelInitializer: 'varianceScaling',
        activation: 'relu'
      })
    )

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }))
    model.add(tf.layers.dropout({ rate: 0.2 }))

    model.add(tf.layers.flatten())
    model.add(tf.layers.dense({ units: 32 }))
    model.add(tf.layers.dense({
      units: numOutputClasses,
      kernelInitializer: 'varianceScaling',
      activation: 'softmax'
    }))

    model.compile({
      optimizer: tf.train.adam(),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })
    return Promise.resolve(new models.TFJS(model))
  }
}