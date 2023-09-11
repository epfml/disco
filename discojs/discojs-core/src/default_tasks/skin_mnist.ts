import { tf, data, training, Task, TaskProvider } from '..'

export const skinMnist: TaskProvider = {
  getTask (): Task {
    return {
      taskID: 'skin_mnist',
      displayInformation: {
        taskTitle: 'Skin disease classification',
        summary: {
          preview: 'Can you determine the skin disease from the dermatoscopic images?',
          overview:
            'HAM10000 "Human Against Machine with 10000 training images" dataset is a large collection of multi-source dermatoscopic images of pigmented lesions from Kaggle'
        },
        limitations:
          'The training data is limited to small images of size 28x28, similarly to the MNIST dataset.',
        tradeoffs: 'Training success strongly depends on label distribution',
        dataFormatInformation: '',
        dataExampleText: 'Below you find an example',
        dataExampleImage: 'http://walidbn.com/ISIC_0024306.jpg'
      },
      trainingInformation: {
        modelID: 'skin_mnist-model',
        epochs: 50,
        roundDuration: 1,
        validationSplit: 0.1,
        batchSize: 32,
        preprocessingFunctions: [data.ImagePreprocessing.Normalize],
        learningRate: 0.001,
        modelCompileData: {
          optimizer: 'adam',
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy']
        },
        dataType: 'image',
        IMAGE_H: 28,
        IMAGE_W: 28,
        LABEL_LIST: [
          'Melanocytic nevi',
          'Melanoma',
          'Benign keratosis-like lesions',
          'Basal cell carcinoma',
          'Actinic keratoses',
          'Vascular lesions',
          'Dermatofibroma'
        ],
        scheme: 'Federated',
        noiseScale: undefined,
        clippingRadius: undefined
      }
    }
  },

  async getModel (): Promise<training.model.Model> {
    const numClasses = 7
    const size = 28

    const model = tf.sequential()

    model.add(
      tf.layers.conv2d({
        inputShape: [size, size, 3],
        filters: 256,
        kernelSize: 3,
        activation: 'relu'
      })
    )

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }))
    model.add(tf.layers.dropout({ rate: 0.3 }))

    model.add(
      tf.layers.conv2d({
        filters: 128,
        kernelSize: 3,
        activation: 'relu'
      })
    )

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }))
    model.add(tf.layers.dropout({ rate: 0.3 }))

    model.add(
      tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        activation: 'relu'
      })
    )

    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }))
    model.add(tf.layers.dropout({ rate: 0.3 }))

    model.add(tf.layers.flatten())

    model.add(tf.layers.dense({ units: 32 }))
    model.add(tf.layers.dense({ units: numClasses, activation: 'softmax' }))

    return new training.model.TFJSModel(this.getTask(), model)
  }
}
