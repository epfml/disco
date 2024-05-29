import * as tf from '@tensorflow/tfjs'

import type { Model, Task, TaskProvider } from '../index.js'
import { data, models } from '../index.js'
import baseModel from '../models/mobileNet_v1_025_224.js'

const IMAGE_SIZE = 224

export const skinMnist: TaskProvider = {
  getTask (): Task {
    return {
      id: 'skin_mnist',
      displayInformation: {
        taskTitle: 'Skin Disease Classification',
        summary: {
          preview: "Identify skin cancer from the dermatoscopic skin lesion images. You can find a sample dataset of 200 images <a class='underline text-primary-dark dark:text-primary-light' href='https://storage.googleapis.com/deai-313515.appspot.com/skin_lesion_samples.tar.gz'>here</a> and the full dataset <a class='underline text-primary-dark dark:text-primary-light' href='https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/DBW86T'>here</a>.",
          overview: "Training of neural networks for automated diagnosis of pigmented skin lesions is hampered by the small size and lack of diversity of available dataset of dermatoscopic images. The HAM10000 ('Human Against Machine with 10000 training images') dataset is composed of dermatoscopic images from different populations, acquired and stored by different modalities. The final dataset consists of 10015 dermatoscopic images which can serve as a training set for academic machine learning purposes. <br>Cases include a representative collection of all important diagnostic categories in the realm of pigmented lesions. You can find more information on the dataset and classification task <a class='underline text-primary-dark dark:text-primary-light' href='https://arxiv.org/abs/1902.03368'>here</a>."
        },
        dataFormatInformation: "Image lesions are classified in 7 categories. The expected labels are written in bold: Actinic keratoses and intraepithelial carcinoma / Bowen's disease (<b>akiec</b>), basal cell carcinoma (<b>bcc</b>), benign keratosis-like lesions (solar lentigines / seborrheic keratoses and lichen-planus like keratoses, <b>bkl</b>), dermatofibroma (<b>df</b>), melanoma (<b>mel</b>), melanocytic nevi (<b>nv</b>) and vascular lesions (angiomas, angiokeratomas, pyogenic granulomas and hemorrhage, <b>vasc</b>).",
        dataExampleText: 'Below you find an example',
        dataExampleImage: 'http://walidbn.com/ISIC_0024306.jpg'
      },
      trainingInformation: {
        modelID: 'skin-mnist-model',
        epochs: 50,
        roundDuration: 2,
        validationSplit: 0.3,
        batchSize: 8,
        preprocessingFunctions: [data.ImagePreprocessing.Resize, data.ImagePreprocessing.Normalize],
        dataType: 'image',
        IMAGE_H: IMAGE_SIZE,
        IMAGE_W: IMAGE_SIZE,
        LABEL_LIST: ['nv', 'vasc', 'mel', 'bkl', 'df', 'akiec', 'bcc'],
        scheme: 'federated',
        noiseScale: undefined,
        clippingRadius: undefined
      }
    }
  },

  async getModel(): Promise<Model> {
    const imageChannels = 3
    const numOutputClasses = 7

    // const model = tf.sequential()

    // model.add(
    //   tf.layers.conv2d({
    //     inputShape: [IMAGE_SIZE, IMAGE_SIZE, imageChannels],
    //     filters: 256,
    //     kernelSize: 3,
    //     strides: 1,
    //     kernelInitializer: 'varianceScaling',
    //     activation: 'relu'
    //   })
    // )

    // model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }))
    // model.add(tf.layers.dropout({ rate: 0.2 }))

    // model.add(
    //   tf.layers.conv2d({
    //     filters: 128,
    //     kernelSize: 3,
    //     strides: 1,
    //     kernelInitializer: 'varianceScaling',
    //     activation: 'relu'
    //   })
    // )

    // model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }))
    // model.add(tf.layers.dropout({ rate: 0.2 }))

    // model.add(
    //   tf.layers.conv2d({
    //     filters: 64,
    //     kernelSize: 3,
    //     strides: 1,
    //     kernelInitializer: 'varianceScaling',
    //     activation: 'relu'
    //   })
    // )

    // model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }))
    // model.add(tf.layers.dropout({ rate: 0.2 }))

    // model.add(tf.layers.flatten())

    // model.add(tf.layers.dense({
    //   units: numOutputClasses,
    //   kernelInitializer: 'varianceScaling',
    //   activation: 'softmax'
    // }))

    const mobilenet = await tf.loadLayersModel({
      load: async () => Promise.resolve(baseModel),
    })

    const x = mobilenet.getLayer('global_average_pooling2d_1')
    const predictions = tf.layers
      .dense({ units: numOutputClasses, activation: 'softmax', kernelInitializer: 'varianceScaling', name: 'denseModified' })
      .apply(x.output) as tf.SymbolicTensor

    const model = tf.model({
      inputs: mobilenet.input,
      outputs: predictions,
      name: 'mobileNetTransferSkinMNIST'
    })

    console.log(model.layers.length)

    // Freeze most of the pre-trained layers
    // Leaves 3 convolution blocks left to retrain
    // You can find the mobilenet architecture at
    // https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json
    for (let i = 0; i < 73; ++i) {
      model.layers[i].trainable = false;
    }

    model.compile({
      optimizer: tf.train.adam(),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })
    return Promise.resolve(new models.TFJS(model))
  }
}