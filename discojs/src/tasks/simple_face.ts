import * as tf from '@tensorflow/tfjs'

import { Task } from '../task'
import { ImagePreprocessing } from '../dataset/preprocessing'

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
    batchSize: 10,
    preprocessingFunctions: [ImagePreprocessing.Normalize],
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

export async function model (): Promise<tf.LayersModel> {
  const file = 'file://./../models/mobileNetV2_35_alpha_2_classes/model.json'
  return await tf.loadLayersModel(file)
}
