import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { models } from '../index.js'

import baseModel from '../models/mobileNet_v1_025_224.js'

export const cifar10: TaskProvider = {
  getTask (): Task {
    return {
      id: 'cifar10',
      displayInformation: {
        taskTitle: 'CIFAR10',
        summary: {
          preview: 'CIFAR-10 is a classic image classification task, and one of the most widely used datasets for machine learning research.',
          overview: "The dataset contains 60,000 32x32 color images in 10 different classes: airplanes, cars, birds, cats, deer, dogs, frogs, horses, ships, and trucks. The official CIFAR-10 website can be found <a class='underline text-blue-400' href='https://www.cs.toronto.edu/~kriz/cifar.html' target='_blank'>here</a>. You can find a link to a sample dataset at the next step (Connect Your Data)."
        },
        model: 'The model is a pretrained <a  class="underline text-blue-400" target="_blank" href="https://github.com/tensorflow/tfjs-models/tree/master/mobilenet">MobileNetV1 model</a> trained in Tensorflow.js. The last output layer is replaced with a fully connected layer with softmax activation and one output neuron per CIFAR10 category. The data preprocessing reshapes images into 224x224 pixels and normalizes values between 0 and 1. The neural network is optimized via Stochastic Gradient Descent and a categorical Cross Entropy loss.',
        dataFormatInformation: 'Images should be of .png format and of size 32x32. <br> The CSV file should start with the exact header "filename,label", and each row should contain an image filename (without extension) and its label.<br><br> For example if you have images: 0.png (of a frog) and 1.png (of a car) <br> The CSV file should be: <br>filename, label <br><br> 0, frog <br> 1, car',
        dataExampleText: 'Below you can find 10 random examples from each of the 10 classes in the dataset.',
        dataExampleImage: 'https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/cifar10-example.png',
        sampleDatasetLink: 'https://storage.googleapis.com/deai-313515.appspot.com/example_training_data.tar.gz',
        sampleDatasetInstructions: 'Opening the link should start downloading a zip file which you can unzip. To connect the data, use the CSV option below and select the file named "cifar10-labels.csv". You can now connect the images located in the "CIFAR10" folder. Note that there are only 24 images in this sample dataset which is far too few to successfully train a machine learning model.'
      },
      trainingInformation: {
        epochs: 10,
        roundDuration: 10,
        validationSplit: 0.2,
        batchSize: 10,
        dataType: 'image',
        IMAGE_H: 224,
        IMAGE_W: 224,
        LABEL_LIST: ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck'],
        scheme: 'decentralized',
        aggregationStrategy: 'mean',
        privacy: { clippingRadius: 20, noiseScale: 1 },
        minNbOfParticipants: 3,
        maxShareValue: 100,
        tensorBackend: 'tfjs'
      }
    }
  },

  async getModel (): Promise<Model<'image'>> {
    const mobilenet = await tf.loadLayersModel({
      load: async () => Promise.resolve(baseModel),
    })

    const x = mobilenet.getLayer('global_average_pooling2d_1')
    const predictions = tf.layers
      .dense({ units: 10, activation: 'softmax', name: 'denseModified' })
      .apply(x.output) as tf.SymbolicTensor

    const model = tf.model({
      inputs: mobilenet.input,
      outputs: predictions,
      name: 'modelModified'
    })

    model.compile({
      optimizer: 'sgd',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })

    return new models.TFJS('image', model)
  }
}
