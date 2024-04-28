import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { data, models } from '../index.js'

export const lusCovid: TaskProvider = {
  getTask (): Task {
    return {
      id: 'lus_covid',
      displayInformation: {
        taskTitle: 'COVID Lung Ultrasound',
        summary: {
          preview: 'Do you have a data of lung ultrasound images on patients <b>suspected of Lower Respiratory Tract infection (LRTI) during the COVID pandemic</b>? <br> Learn how to discriminate between COVID positive and negative patients by joining this task.',
          overview: "Don’t have a dataset of your own? Download a sample of a few cases <a class='underline' href='https://drive.switch.ch/index.php/s/zM5ZrUWK3taaIly' target='_blank'>here</a>."
        },
        model: "We use a simplified* version of the <b>DeepChest model</b>: A deep learning model developed in our lab (<a class='underline' href='https://www.epfl.ch/labs/mlo/igh-intelligent-global-health/'>intelligent Global Health</a>.). On a cohort of 400 Swiss patients suspected of LRTI, the model obtained over 90% area under the ROC curve for this task. <br><br>*Simplified to ensure smooth running on your browser, the performance is minimally affected. Details of the adaptations are below <br>- <b>Removed</b>: positional embedding (i.e. we don’t take the anatomic position into consideration). Rather, the model now does mean pooling over the feature vector of the images for each patient <br>- <b>Replaced</b>: ResNet18 by Mobilenet",
        tradeoffs: 'We are using a simpler version of DeepChest in order to be able to run it on the browser.',
        dataFormatInformation: 'This model takes as input an image dataset. It consists on a set of lung ultrasound images per patient with its corresponding label of covid positive or negative. Moreover, to identify the images per patient you have to follow the follwing naming pattern: "patientId_*.png"',
        dataExampleText: 'Below you can find an example of an expected lung image for patient 2 named: 2_QAID_1.masked.reshaped.squared.224.png',
        dataExampleImage: 'https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/2_QAID_1.masked.reshaped.squared.224.png'
      },
      trainingInformation: {
        modelID: 'lus-covid-model',
        epochs: 15,
        roundDuration: 10,
        validationSplit: 0.2,
        batchSize: 5,
        IMAGE_H: 100,
        IMAGE_W: 100,
        preprocessingFunctions: [data.ImagePreprocessing.Resize, data.ImagePreprocessing.Normalize],
        LABEL_LIST: ['COVID-Positive', 'COVID-Negative'],
        dataType: 'image',
        scheme: 'decentralized',
        noiseScale: undefined,
        clippingRadius: 20,
        decentralizedSecure: true,
        minimumReadyPeers: 3,
        maxShareValue: 100
      }
    }
  },

  // Model architecture from tensorflow.js docs: 
  // https://codelabs.developers.google.com/codelabs/tfjs-training-classfication/index.html#4
  async getModel (): Promise<Model> {
    const imageHeight = 100
    const imageWidth = 100
    const imageChannels = 3
    const numOutputClasses = 2
    const model = tf.sequential()

    // In the first layer of our convolutional neural network we have
    // to specify the input shape. Then we specify some parameters for
    // the convolution operation that takes place in this layer.
    model.add(tf.layers.conv2d({
      inputShape: [imageHeight, imageWidth, imageChannels],
      kernelSize: 5,
      filters: 8,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling'
    }))

    // The MaxPooling layer acts as a sort of downsampling using max values
    // in a region instead of averaging.
    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }))

    // Repeat the conv2d + maxPooling block.
    // Note that we have more filters in the convolution.
    model.add(tf.layers.conv2d({
      kernelSize: 5,
      filters: 16,
      strides: 1,
      activation: 'relu',
      kernelInitializer: 'varianceScaling'
    }))
    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }))

    // Now we flatten the output from the 2D filters into a 1D vector to prepare
    // it for input into our last layer. This is common practice when feeding
    // higher dimensional data to a final classification output layer.
    model.add(tf.layers.flatten())

    // Our last layer is a dense layer which has 2 output units, one for each
    // output class.
    model.add(tf.layers.dense({
      units: numOutputClasses,
      kernelInitializer: 'varianceScaling',
      activation: 'softmax'
    }))

    model.compile({
      optimizer: 'sgd',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    })

    return Promise.resolve(new models.TFJS(model))
  }
}
