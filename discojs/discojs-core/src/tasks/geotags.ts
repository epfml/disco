import { tf, Task } from '..'

export const task: Task = {
  taskID: 'geotags',
  displayInformation: {
    taskTitle: 'GEOTAGS',
    summary: {
      preview: 'In this challenge, we predict the geo-location of a photo given its pixels in terms of cell number of a grid built on top of Switzerland',
      overview: 'The geotags dataset is a collection of images with geo-location information used to train a machine learning algorithm to predict the location of a photo given its pixels.'
    },
    limitations: 'The training data is limited to images of size 224x224.',
    tradeoffs: 'Training success strongly depends on label distribution',
    dataFormatInformation: 'Images should be of .png format and of size 224x224. <br> The label file should be .csv, where each row contains a file_name, class.  The class is the cell number of a the given grid of Switzerland. ',
    dataExampleText: 'Below you can find 10 random examples from each of the 10 classes in the dataset.'
  },
  trainingInformation: {
    modelID: 'geotags-model',
    epochs: 10,
    roundDuration: 10,
    validationSplit: 0.2,
    batchSize: 10,
    modelCompileData: {
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    },
    dataType: 'image',
    IMAGE_H: 224,
    IMAGE_W: 224,
    preprocessingFunctions: [],
    LABEL_LIST: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', ' 27'], // TO BE CHANGED
    scheme: 'Federated',
    noiseScale: undefined,
    clippingRadius: 20,
    decentralizedSecure: true,
    minimumReadyPeers: 3,
    maxShareValue: 100
  }
}

export async function model (_: string = ''): Promise<tf.LayersModel> {
  const pretrainedModel = await tf.loadLayersModel(
    'https://storage.googleapis.com/epfl-disco-models/geotags/v2/model.json'
  )

  const numLayers = pretrainedModel.layers.length

  pretrainedModel.layers.forEach(layer => { layer.trainable = false })
  pretrainedModel.layers[numLayers - 1].trainable = true

  const model = tf.sequential({
    layers: [
      tf.layers.inputLayer({ inputShape: [224, 224, 3] }),
      tf.layers.rescaling({ scale: 1 / 127.5, offset: -1 }), // Rescaling input between -1 and 1
      pretrainedModel
    ]
  })

  return model
}
