import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { models } from '../index.js'

export const lusCovid: TaskProvider<'image'> = {
  getTask (): Task<'image'> {
    return {
      id: 'lus_covid',
      displayInformation: {
        taskTitle: 'Lung Ultrasound Image Classification',
        summary: {
          preview: "Medical images are a typical example of data that exists in huge quantity yet that can't be shared due to confidentiality reasons. Medical applications would immensely benefit from training on data currently locked. More data diversity leads to better generalization and bias mitigation.",
          overview: "Disco allows data owners to collaboratively train machine learning models using their respective data without any privacy breach. This example problem is about diagnosing whether patients are positive or negative to COVID-19 from lung ultrasounds images. <br>Don't have a dataset of your own? You can find a link to a sample dataset at the next step."
        },
        model: "The model is a simple Convolutional Neural Network composed of two convolutional layers with ReLU activations and max pooling layers, followed by a fully connected output layer. The data preprocessing reshapes images into 100x100 pixels and normalizes values between 0 and 1",
        dataFormatInformation: 'This model takes as input an image dataset of lung ultrasounds. The images are resized automatically.',
        dataExampleText: 'Below you can find an example of an expected lung image.',
        dataExampleImage: 'https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/2_QAID_1.masked.reshaped.squared.224.png',
        sampleDatasetLink: 'https://drive.switch.ch/index.php/s/zM5ZrUWK3taaIly',
        sampleDatasetInstructions: 'Opening the link will take you to a Switch Drive folder. You can click on the Download button in the top right corner. Unzip the file and you will get two subfolders: "COVID-" and "COVID+". You can connect the data by using the Group option and selecting each image group in its respective field.'
      },
      trainingInformation: {
        epochs: 50,
        roundDuration: 2,
        validationSplit: 0.2,
        batchSize: 5,
        IMAGE_H: 100,
        IMAGE_W: 100,
        LABEL_LIST: ['COVID-Positive', 'COVID-Negative'],
        dataType: 'image',
        scheme: 'federated',
        aggregationStrategy: 'mean',
        minNbOfParticipants: 2,
        tensorBackend: 'tfjs'
      }
    }
  },

  // Model architecture from tensorflow.js docs: 
  // https://codelabs.developers.google.com/codelabs/tfjs-training-classfication/index.html#4
  async getModel (): Promise<Model<'image'>> {
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

    return Promise.resolve(new models.TFJS('image', model))
  }
}
