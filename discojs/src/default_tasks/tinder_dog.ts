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
        model: 'The model is a simple Convolutional Neural Network composed of two convolutional layers with ReLU activations and max pooling layers, followed by a fully connected output layer. The data preprocessing reshapes images into 64x64 pixels and normalizes values between 0 and 1',
        dataFormatInformation: 'Accepted image formats are .png .jpg and .jpeg.',
        dataExampleText: '',
        dataExampleImage: 'https://storage.googleapis.com/deai-313515.appspot.com/tinder_dog_preview.png',
        sampleDatasetLink: 'https://storage.googleapis.com/deai-313515.appspot.com/tinder_dog.zip',
        sampleDatasetInstructions: 'Opening the link should start downloading a zip file which you can unzip. To connect the data, pick one of the data splits (the folder 0 for example) and use the CSV option below to select the file named "labels.csv". You can now connect the images located in the same folder.'
      },
      trainingInformation: {
        epochs: 10,
        roundDuration: 2,
        validationSplit: 0, // nicer plot for GDHF demo
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
    const seed = 42 // set a seed to ensure reproducibility during GDHF demo
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