import { tf, Task } from '..'

export const task: Task = {
    taskID: 'deep_breath',
    displayInformation: {
      taskTitle: 'DeepBreath',
      summary: {
        preview: 'In this task, we ask you to classify digital lung auscultation audio files into categories based on the patterns recognized on the recordings.',
        overview: 'The DeepBreath dataset is a collection digital lung audio recordings collected from patients across eight anatomic sites.'
      },
      limitations: 'The training data must first be pre-processed through a signal processing pipeline.',
      tradeoffs: 'Training success strongly depends on label distribution',
      dataFormatInformation: '',
      //dataExampleText: 'Below you can find 4 random examples from each of the classes in the dataset.',
      //dataExampleImage: 'https://storage.googleapis.com/deai-313515.appspot.com/example_training_data/cifar10-example.png'
    },
    trainingInformation: {
      modelID: 'deep-breath-model',
      epochs: 90,
      roundDuration: 5,
      validationSplit: 0.2,
      batchSize: 64,
      modelCompileData: {
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      },
      dataType: 'image',
      IMAGE_H: 128,
      IMAGE_W: 256,
      LABEL_LIST: ['healthy', 'pneumonia','wheezing','bronchilitis'],
      scheme: 'Decentralized',
      noiseScale: undefined,
      clippingRadius: 20,
      decentralizedSecure: true,
      minimumReadyPeers: 3,
      maxShareValue: 100  
    }
  }
  
  export async function model (): Promise<tf.LayersModel> {
    return await tf.loadLayersModel(
        'https://storage.googleapis.com/deai-313515.appspot.com/models/mobileNetV2_35_alpha_2_classes/model.json'
      )

  }
  