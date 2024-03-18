import tf from '@tensorflow/tfjs'

import type { TaskProvider } from '@epfml/discojs-core'
import { models } from '@epfml/discojs-core'
import { Disco as DiscoServer } from '@epfml/disco-server'

// Define your own task provider (task definition + model)
const customTask: TaskProvider = {
  getTask () {
    return {
      id: 'custom-task',
      displayInformation: {
        taskTitle: 'Custom task'
      },
      trainingInformation: {
        modelID: 'custom-model',
        epochs: 5,
        roundDuration: 10,
        validationSplit: 0,
        batchSize: 30,
        dataType: 'tabular',
        inputColumns: [
          'Age'
        ],
        outputColumns: [
          'Output'
        ],
        scheme: 'federated',
        noiseScale: undefined,
        clippingRadius: undefined
      }
    }
  },

  getModel () {
    const model = tf.sequential()

    model.add(
      tf.layers.dense({
        inputShape: [1],
        units: 124,
        activation: 'relu',
        kernelInitializer: 'leCunNormal'
      })
    )
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }))
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }))

    model.compile({
      optimizer: 'rmsprop',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    })

    return Promise.resolve(new models.TFJS(model))
  }
}

async function runServer (): Promise<void> {
  const server = new DiscoServer()
  // Add default tasks provided by the server
  await server.addDefaultTasks()
  // Add your own custom task
  await server.addTask(customTask)

  // You can also provide your own task object containing the URL of the model

  // await disco.addTask({
  //   ...
  //   trainingInformation: {
  //       modelID: 'test-model',
  //       epochs: 5,
  //       modelURL: 'https://example.com/path/to/your/model.json',
  //   }
  //   ...
  // })

  // Or provide an URL separately

  // await server.addTask(customTask.getTask(), new URL('https://example.com/path/to/your/model.json'))

  // Start the server
  server.serve()
}

runServer().catch(console.error)
