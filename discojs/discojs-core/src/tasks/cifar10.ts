import { tf, Task } from '..'

export const task: Task = {
  taskID: 'cifar10',
  displayInformation: {
    taskTitle: 'CIFAR10',
    summary: {
      preview: 'In this challenge, we ask you to classify images into categories based on the objects shown on the image.',
      overview: 'The CIFAR-10 dataset is a collection of images that are commonly used to train machine learning and computer vision algorithms. It is one of the most widely used datasets for machine learning research.'
    },
    limitations: 'The training data is limited to small images of size 32x32.',
    tradeoffs: 'Training success strongly depends on label distribution',
    dataFormatInformation: 'Images should be of .png format and of size 32x32. <br> The label file should be .csv, where each row contains a file_name, class.  <br> <br> e.g. if you have images: 0.png (of a frog) and 1.png (of a car) <br> labels.csv contains: (Note that no header is needed)<br> 0.png, frog <br> 1.png, car',
    dataExampleText: 'Below you can find 10 random examples from each of the 10 classes in the dataset.',
    dataExampleImage: './cifar10-example.png'
  },
  trainingInformation: {
    modelID: 'cifar10-model',
    epochs: 10,
    roundDuration: 10,
    validationSplit: 0.2,
    batchSize: 10,
    modelCompileData: {
      optimizer: 'sgd',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    },
    dataType: 'image',
    IMAGE_H: 32,
    IMAGE_W: 32,
    preprocessingFunctions: [],
    RESIZED_IMAGE_H: 224,
    RESIZED_IMAGE_W: 224,
    LABEL_LIST: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    scheme: 'Decentralized',
    noiseScale: undefined,
    clippingRadius: 20,
    decentralizedSecure: true,
    minimumReadyPeers: 3,
    maxShareValue: 100
  }
}

export async function model (_: string = ''): Promise<tf.LayersModel> {
  const mobilenet = await tf.loadLayersModel(
    'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
  )
  const x = mobilenet.getLayer('global_average_pooling2d_1')
  const predictions = tf.layers
    .dense({ units: 10, activation: 'softmax', name: 'denseModified' })
    .apply(x.output) as tf.SymbolicTensor

  return tf.model({
    inputs: mobilenet.input,
    outputs: predictions,
    name: 'modelModified'
  })
}
