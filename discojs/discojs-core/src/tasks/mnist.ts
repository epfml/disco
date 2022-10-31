import { tf, Task } from '..'

export const task: Task = {
  taskID: 'mnist',
  displayInformation: {
    taskTitle: 'MNIST',
    summary: {
      preview: "Test our platform by using a publicly available <b>image</b> dataset. <br><br> Download the classic MNIST imagebank of hand-written numbers <a class='underline text-primary-dark dark:text-primary-light' href='https://www.kaggle.com/scolianni/mnistasjpg'>here</a>. <br> This model learns to identify hand written numbers.",
      overview: 'The MNIST handwritten digit classification problem is a standard dataset used in computer vision and deep learning. Although the dataset is effectively solved, we use it to test our Decentralised Learning algorithms and platform.'
    },
    model: 'The current model is a very simple CNN and its main goal is to test the app and the Decentralizsed Learning functionality.',
    tradeoffs: 'We are using a simple model, first a 2d convolutional layer > max pooling > 2d convolutional layer > max pooling > convolutional layer > 2 dense layers.',
    dataFormatInformation: 'This model is trained on images corresponding to digits 0 to 9. You can upload each digit image of your dataset in the box corresponding to its label. The model taskes images of size 28x28 as input.',
    dataExampleText: 'Below you can find an example of an expected image representing the digit 9.',
    dataExampleImage: 'http://storage.googleapis.com/deai-313515.appspot.com/example_training_data/9-mnist-example.png'
  },
  trainingInformation: {
    modelID: 'mnist-model',
    epochs: 10,
    roundDuration: 10,
    validationSplit: 0.2,
    batchSize: 30,
    modelCompileData: {
      optimizer: 'rmsprop',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    },
    dataType: 'image',
    IMAGE_H: 28,
    IMAGE_W: 28,
    preprocessingFunctions: [],
    LABEL_LIST: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    scheme: 'Decentralized',
    noiseScale: undefined,
    clippingRadius: 20,
    decentralizedSecure: true,
    minimumReadyPeers: 3,
    maxShareValue: 100
  }
}

export function model (): tf.LayersModel {
  const model = tf.sequential()

  model.add(
    tf.layers.conv2d({
      inputShape: [28, 28, 3],
      kernelSize: 3,
      filters: 16,
      activation: 'relu'
    })
  )
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }))
  model.add(
    tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' })
  )
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }))
  model.add(
    tf.layers.conv2d({ kernelSize: 3, filters: 32, activation: 'relu' })
  )
  model.add(tf.layers.flatten({}))
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: 10, activation: 'softmax' }))

  return model
}
