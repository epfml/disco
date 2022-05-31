import * as tf from '@tensorflow/tfjs'

import { Task } from '../task'

export const task: Task = {
  taskID: 'lus_covid',
  displayInformation: {
    taskTitle: 'COVID Lung Ultrasound',
    summary: "Do you have a dataset of lung ultrasound images on patients <b>suspected of Lower Respiratory Tract infection (LRTI) during the COVID pandemic</b>? <br> Learn how to discriminate between COVID positive and negative patients by joining this task. <br><br> Don’t have a dataset of your own? Download a sample of a few cases <a class='underline text-primary-dark dark:text-primary-light' href='https://drive.switch.ch/index.php/s/zM5ZrUWK3taaIly'>here</a>.",
    overview: "Do you have a dataset of lung ultrasound images on patients <b>suspected of Lower Respiratory Tract infection (LRTI) during the COVID pandemic</b>? <br> Learn how to discriminate between COVID positive and negative patients by joining this task. <br><br> Don’t have a dataset of your own? Download a sample of a few cases <a class='underline text-primary-dark dark:text-primary-light' href='https://drive.switch.ch/index.php/s/zM5ZrUWK3taaIly'>here</a>.",
    model: 'We use a simplified* version of the <b>DeepChest model</b>: A deep learning model developed in our lab (intelligent Global Health). On a cohort of 400 Swiss patients suspected of LRTI, the model obtained over 90% area under the ROC curve for this task. <br><br>*Simplified to ensure smooth running on your browser, the performance is minimally affected. Details of the adaptations are below <br>- <b>Removed</b>: positional embedding (i.e. we don’t take the anatomic position into consideration). Rather, the model now does mean pooling over the feature vector of the images for each patient <br>- <b>Replaced</b>: ResNet18 by Mobilenet',
    tradeoffs: 'We are using a simpler version of DeepChest in order to be able to run it on the browser.',
    dataFormatInformation: 'This model takes as input an image dataset. It consists on a set of lung ultrasound images per patient with its corresponding label of covid positive or negative. Moreover, to identify the images per patient you have to follow the follwing naming pattern: "patientId_*.png"',
    dataExampleText: 'Below you can find an example of an expected lung image for patient 2 named: 2_QAID_1.masked.reshaped.squared.224.png',
    dataExampleImage: './2_QAID_1.masked.reshaped.squared.224.png'
  },
  trainingInformation: {
    modelID: 'lus-covid-model',
    epochs: 15,
    roundDuration: 10,
    validationSplit: 0.2,
    batchSize: 2,
    modelCompileData: {
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    },
    learningRate: 0.05,
    threshold: 2,
    IMAGE_H: 224,
    IMAGE_W: 224,
    preprocessFunctions: [],
    LABEL_LIST: ['COVID-Positive', 'COVID-Negative'],
    NUM_CLASSES: 2,
    dataType: 'image',
    aggregateImagesById: true,
    scheme: 'Decentralized'
  }
}

export function model (): tf.LayersModel {
  const model = tf.sequential()

  model.add(
    tf.layers.dense({ inputShape: [1000], units: 512, activation: 'relu' })
  )
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 2, activation: 'softmax' }))

  return model
}
