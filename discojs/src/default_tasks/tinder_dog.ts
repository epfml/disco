import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { models } from '../index.js'

export const tinderDog: TaskProvider<'image'> = {
  getTask (): Task<'image'> {
    return {
      id: 'tinder_dog',
      displayInformation: {
        taskTitle: 'GDHF 2024 | TinderDog',
        summary: {
          preview: 'Which dog is the cutest....or not?',
          overview: "Binary classification model for dog cuteness."
        },
        // model: 'The model is a pretrained <a  class="underline text-blue-400" target="_blank" href="https://github.com/tensorflow/tfjs-models/tree/master/mobilenet">MobileNetV1 model</a> trained in Tensorflow.js. The last output layer is replaced with a fully connected layer with softmax activation and one output neuron per CIFAR10 category. The data preprocessing reshapes images into 224x224 pixels and normalizes values between 0 and 1. The neural network is optimized via Stochastic Gradient Descent and a categorical Cross Entropy loss.',
        dataFormatInformation: 'Images should be of .png format.',
       /*  dataExampleText: 'Below you can find 10 random examples from each of the 10 classes in the dataset.',
        dataExampleImage: 'https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/cifar10-example.png',
        sampleDatasetLink: 'https://storage.googleapis.com/deai-313515.appspot.com/example_training_data.tar.gz',
        sampleDatasetInstructions: 'Opening the link should start downloading a zip file which you can unzip. To connect the data, use the CSV option below and select the file named "cifar10-labels.csv". You can now connect the images located in the "CIFAR10" folder. Note that there are only 24 images in this sample dataset which is far too few to successfully train a machine learning model.' */
      },
      trainingInformation: {
        epochs: 10,
        roundDuration: 2,
        validationSplit: 0,
        batchSize: 10,
        dataType: 'image',
        IMAGE_H: 64,
        IMAGE_W: 64,
        LABEL_LIST: ['Cute dogs', 'Less cute dogs'],
        scheme: 'federated',
        aggregationStrategy: 'mean',
        minNbOfParticipants: 3,
        tensorBackend: 'tfjs'
      }
    }
  },


  async getModel(): Promise<Model<'image'>> {
    const seed = 42
    const imageHeight = this.getTask().trainingInformation.IMAGE_H
    const imageWidth = this.getTask().trainingInformation.IMAGE_W
    const imageChannels = 3

    const model = tf.sequential()

    model.add(
      tf.layers.conv2d({
        inputShape: [imageHeight, imageWidth, imageChannels],
        kernelSize: 5,
        filters: 8,
        activation: 'relu',
        kernelInitializer: tf.initializers.heNormal({ seed })
      })
    )
    model.add(tf.layers.conv2d({
      kernelSize: 5, filters: 16, activation: 'relu',
      kernelInitializer: tf.initializers.heNormal({ seed })
    }))
    model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }))
    model.add(tf.layers.dropout({ rate: 0.25, seed }))

    model.add(tf.layers.flatten())
    model.add(tf.layers.dense({
      units: 32, activation: 'relu',
      kernelInitializer: tf.initializers.heNormal({ seed })
     }))
    model.add(tf.layers.dropout({rate:0.25, seed}))
    model.add(tf.layers.dense({
      units: 2, activation: 'softmax',
      kernelInitializer: tf.initializers.heNormal({ seed })
     }))

    model.compile({
      optimizer: tf.train.adam(0.0005),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })

    return Promise.resolve(new models.TFJS('image', model))
  }
}