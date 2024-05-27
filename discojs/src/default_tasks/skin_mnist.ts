import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { data, models } from '../index.js'

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
        IMAGE_H: 28,
        IMAGE_W: 28,
        LABEL_LIST: ['nv', 'vasc', 'mel', 'bkl', 'df', 'akiec', 'bcc'],
        scheme: 'federated',
        noiseScale: undefined,
        clippingRadius: undefined
      }
    }
  },

  // async getModel (): Promise<Model> {
  //   const imageHeight = 28
  //   const imageWidth = 28
  //   const imageChannels = 3
  //   const numOutputClasses = 7
  //   const model = tf.sequential()

  //   // In the first layer of our convolutional neural network we have
  //   // to specify the input shape. Then we specify some parameters for
  //   // the convolution operation that takes place in this layer.
  //   model.add(tf.layers.conv2d({
  //     inputShape: [imageHeight, imageWidth, imageChannels],
  //     kernelSize: 5,
  //     filters: 8,
  //     strides: 1,
  //     activation: 'relu',
  //     kernelInitializer: 'varianceScaling'
  //   }))

  //   // The MaxPooling layer acts as a sort of downsampling using max values
  //   // in a region instead of averaging.
  //   model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }))

  //   // Repeat the conv2d + maxPooling block.
  //   // Note that we have more filters in the convolution.
  //   model.add(tf.layers.conv2d({
  //     kernelSize: 5,
  //     filters: 16,
  //     strides: 1,
  //     activation: 'relu',
  //     kernelInitializer: 'varianceScaling'
  //   }))
  //   model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }))

  //   // Now we flatten the output from the 2D filters into a 1D vector to prepare
  //   // it for input into our last layer. This is common practice when feeding
  //   // higher dimensional data to a final classification output layer.
  //   model.add(tf.layers.flatten())

  //   // Our last layer is a dense layer which has 2 output units, one for each
  //   // output class.
  //   model.add(tf.layers.dense({
  //     units: numOutputClasses,
  //     kernelInitializer: 'varianceScaling',
  //     activation: 'softmax'
  //   }))

  //   model.compile({
  //     optimizer: 'adam',
  //     loss: 'categoricalCrossentropy',
  //     metrics: ['accuracy']
  //   })

  //   return Promise.resolve(new models.TFJS(model))
  // }
  async getModel(): Promise<Model> {
    const imageHeight = 28
    const imageWidth = 28
    const imageChannels = 3
    const numOutputClasses = 7

    const model = tf.sequential()

    model.add(
      tf.layers.conv2d({
        inputShape: [imageHeight, imageWidth, imageChannels],
        filters: 256,
        kernelSize: 3,
        activation: 'relu'
      })
    )

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }))
    model.add(tf.layers.dropout({ rate: 0.3 }))

    model.add(
      tf.layers.conv2d({
        filters: 128,
        kernelSize: 3,
        activation: 'relu'
      })
    )

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }))
    model.add(tf.layers.dropout({ rate: 0.3 }))

    model.add(
      tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        activation: 'relu'
      })
    )

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }))
    model.add(tf.layers.dropout({ rate: 0.3 }))

    model.add(tf.layers.flatten())

    model.add(tf.layers.dense({ units: 32 }))
    model.add(tf.layers.dense({ units: numOutputClasses, activation: 'softmax' }))

    model.compile({
      optimizer: tf.train.adam(0.00001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })
    return Promise.resolve(new models.TFJS(model))
  }
}