import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { data, models } from '../index.js'
import baseModel from '../models/mobileNetV2_35_alpha_2_classes.js'

export const simpleFace: TaskProvider = {
  getTask (): Task {
    return {
      id: 'simple_face',
      displayInformation: {
        taskTitle: 'Simple Face',
        summary: {
          preview: 'Can you detect if the person in a picture is a child or an adult?',
          overview: 'Simple face is a small subset of the public face_task dataset from Kaggle'
        },
        dataFormatInformation: '',
        dataExampleText: 'Below you can find an example',
        dataExampleImage: 'https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/simple_face-example.png',
        sampleDatasetLink: "https://storage.googleapis.com/deai-313515.appspot.com/example_training_data.tar.gz",
        sampleDatasetInstructions: 'Opening the link should start downloading a zip file which you can unzip. Inside the "example_training_data" directory you should find the "simple_face" folder which contains the "adult" and "child" folders. To connect the data, select the Group option below and connect adults and children image groups.'
      },
      trainingInformation: {
        epochs: 50,
        roundDuration: 1,
        validationSplit: 0.2,
        batchSize: 10,
        preprocessingFunctions: [data.ImagePreprocessing.Normalize],
        dataType: 'image',
        IMAGE_H: 200,
        IMAGE_W: 200,
        LABEL_LIST: ['child', 'adult'],
        scheme: 'federated',
        minNbOfParticipants: 2,
        tensorBackend: 'tfjs'
      }
    }
  },

  async getModel (): Promise<Model> {
    const model = await tf.loadLayersModel({
      load: async () => Promise.resolve(baseModel),
    });

    model.compile({
      optimizer: tf.train.sgd(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })

    return new models.TFJS(model)
  }
}
