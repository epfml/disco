import { tf, Task, data, TaskProvider } from '..'
import { Range } from 'immutable'
import { LabelTypeEnum } from '../task/label_type'

export const geotags: TaskProvider = {
  getTask (): Task {
    return {
      taskID: 'geotags',
      displayInformation: {
        taskTitle: 'GeoTags',
        summary: {
          preview: 'In this challenge, we predict the geo-location of a photo given its pixels in terms of a cell number of a grid built on top of Switzerland',
          overview: 'The geotags dataset is a collection of images with geo-location information used to train a machine learning algorithm to predict the location of a photo given its pixels.'
        },
        limitations: 'The training data is limited to images of size 224x224.',
        tradeoffs: 'Training success strongly depends on label distribution',
        dataFormatInformation: 'Images should be of .png format and of size 224x224. <br> The label file should be .csv, where each row contains a file_name, class.  The class is the cell number of a the given grid of Switzerland. ',
        labelDisplay: {
          labelType: LabelTypeEnum.POLYGON_MAP,
          mapBaseUrl: 'https://disco-polygon.web.app/'
        }
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
        preprocessingFunctions: [data.ImagePreprocessing.Resize],
        LABEL_LIST: Range(0, 127).map(String).toArray(),
        scheme: 'Federated',
        noiseScale: undefined,
        clippingRadius: 20,
        decentralizedSecure: true,
        minimumReadyPeers: 3,
        maxShareValue: 100
      }
    }
  },

  async getModel (): Promise<tf.LayersModel> {
    const pretrainedModel = await tf.loadLayersModel(
      'https://storage.googleapis.com/deai-313515.appspot.com/models/geotags/model.json'
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
}
