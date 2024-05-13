import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { data, models } from '../index.js'

export const simpleFace: TaskProvider = {
  getTask (): Task {
    return {
      id: 'simple_face',
      displayInformation: {
        taskTitle: 'Simple Face',
        summary: {
          preview: 'Can you detect if the person in a picture is a child or an adult?',
          overview: 'Simple face is a small subset of face_task from Kaggle'
        },
        dataFormatInformation: '',
        dataExampleText: 'Below you find an example',
        dataExampleImage: 'https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/simple_face-example.png'
      },
      trainingInformation: {
        modelID: 'simple_face-model',
        epochs: 50,
        roundDuration: 1,
        validationSplit: 0.2,
        batchSize: 10,
        preprocessingFunctions: [data.ImagePreprocessing.Normalize],
        dataType: 'image',
        IMAGE_H: 200,
        IMAGE_W: 200,
        LABEL_LIST: ['child', 'adult'],
        scheme: 'federated', // secure aggregation not yet implemented for federated
        noiseScale: undefined,
        clippingRadius: undefined
      }
    }
  },

  async getModel (): Promise<Model> {
    const model = await tf.loadLayersModel(
      'https://storage.googleapis.com/deai-313515.appspot.com/models/mobileNetV2_35_alpha_2_classes/model.json'
    )

    model.compile({
      optimizer: tf.train.sgd(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })

    return new models.TFJS(model)
  }
}
