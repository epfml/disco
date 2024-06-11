import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { data, models } from '../index.js'

const IMAGE_SIZE = 128
const LABELS = ['Eczema', 'Allergic Contact Dermatitis', 'Urticaria']

export const skinCondition: TaskProvider = {
  getTask (): Task {
    return {
      id: 'skin_condition',
      displayInformation: {
        taskTitle: 'Skin Condition Classification',
        summary: {
          preview: "Identify common skin conditions from volunteer image contributions. You can find a sample dataset of 400 images <a class='underline text-primary-dark dark:text-primary-light' href='https://storage.googleapis.com/deai-313515.appspot.com/scin_sample.zip'>here</a> or see the full <a class='underline text-primary-dark dark:text-primary-light' href='https://github.com/google-research-datasets/scin/tree/main'>SCIN dataset</a>. You can find how to download and preprocess the dataset <a class='underline text-primary-dark dark:text-primary-light' href='https://github.com/epfml/disco/blob/develop/docs/examples/scin_dataset.ipynb'>in this notebook</a>.",
          overview: "The <a class='underline text-primary-dark dark:text-primary-light' href='https://github.com/google-research-datasets/scin/tree/main'>SCIN (Skin Condition Image Network) open access dataset</a> aims to supplement publicly available dermatology datasets from health system sources with representative images from internet users. To this end, the SCIN dataset was collected from Google Search users in the United States through a voluntary, consented image donation application. The SCIN dataset is intended for health education and research, and to increase the diversity of dermatology images available for public use. The SCIN dataset contains 5,000+ volunteer contributions (10,000+ images) of common dermatology conditions. Contributions include Images, self-reported demographic, history, and symptom information, and self-reported Fitzpatrick skin type (sFST). In addition, dermatologist labels of the skin condition are provided for each contribution. You can find more information on the dataset and classification task <a class='underline text-primary-dark dark:text-primary-light' href='https://arxiv.org/abs/2402.18545'>here</a>."
        },
        dataFormatInformation: "There are hundreds of skin condition labels in the SCIN dataset. For the sake of simplicity, we only include the 3 most common conditions in the sample dataset: 'Eczema', 'Allergic Contact Dermatitis' and 'Urticaria'. Therefore, each image is expected to be labeled with one of these three categories.",
        sampleDatasetLink: 'https://storage.googleapis.com/deai-313515.appspot.com/scin_sample.zip'
      },
      trainingInformation: {
        modelID: 'skin-condition-model',
        epochs: 10,
        roundDuration: 2,
        validationSplit: 0.3,
        batchSize: 8,
        preprocessingFunctions: [data.ImagePreprocessing.Resize, data.ImagePreprocessing.Normalize],
        dataType: 'image',
        IMAGE_H: IMAGE_SIZE,
        IMAGE_W: IMAGE_SIZE,
        LABEL_LIST: LABELS,
        scheme: 'federated',
        noiseScale: undefined,
        clippingRadius: undefined,
        tensorBackend: 'tfjs'
      }
    }
  },

  async getModel(): Promise<Model> {
    const imageChannels = 3
    const numOutputClasses = LABELS.length

    const model = tf.sequential()

    model.add(
      tf.layers.conv2d({
        inputShape: [IMAGE_SIZE, IMAGE_SIZE, imageChannels],
        filters: 8,
        kernelSize: 3,
        strides: 1,
        kernelInitializer: 'varianceScaling',
        activation: 'relu'
      })
    )
    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2]}))
    model.add(tf.layers.dropout({ rate: 0.2 }))

    const convFilters = [16, 32, 64, 128]
    for (const filters of convFilters) {
      model.add(
        tf.layers.conv2d({
          filters: filters,
          kernelSize: 3,
          strides: 1,
          kernelInitializer: 'varianceScaling',
          activation: 'relu'
        })
      )
  
      model.add(tf.layers.maxPooling2d({ poolSize: [2, 2]}))
      model.add(tf.layers.dropout({ rate: 0.2 }))
    }

    model.add(tf.layers.flatten())
    model.add(tf.layers.dense({
      units: 64,
      kernelInitializer: 'varianceScaling',
      activation: 'relu',
    }))

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