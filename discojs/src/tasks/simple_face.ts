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
    IMAGE_H: 200,
    IMAGE_W: 200,
    LABEL_LIST: ['child', 'adult'],
    scheme: 'Federated', // secure aggregation not yet implemented for FeAI
    noiseScale: undefined,
    clippingRadius: undefined
  }
}

export async function model (modelPath: string): Promise<tf.LayersModel> {
  // Note file:// is a special token to tell tf that we
  // are loading from the file system, so it should not
  // be used with path.join, since this will normalize
  // the path and thus also the special token.
  return await tf.loadLayersModel(`file://${modelPath}`)
}
