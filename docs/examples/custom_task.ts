import tf from '@tensorflow/tfjs-node'

import type { TaskProvider } from '@epfml/discojs'
import { defaultTasks, models } from '@epfml/discojs'
import { Server as DiscoServer } from 'server'

// Define your own task provider (task definition + model)
const customTask: TaskProvider = {
  getTask () {
    return {
      id: 'custom-task',
      displayInformation: {
        taskTitle: 'Custom task',
        summary: {
          preview: 'task preview',
          overview: 'task overview'
        }
      },
      trainingInformation: {
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
        minNbOfParticipants: 2,
        tensorBackend: 'tfjs',
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

    return Promise.resolve(new models.TFJS('tabular', model))
  }
}

async function runServer (): Promise<void> {
  // Create server
  const server = new DiscoServer()

  // You can also provide your own task object containing the URL of the model

  // await disco.addTask({
  //   ...
  //   trainingInformation: {
  //       epochs: 5,
  //       modelURL: 'https://example.com/path/to/your/model.json',
  //   }
  //   ...
  // })

  // Or provide an URL separately

  // await server.addTask(customTask.getTask(), new URL('https://example.com/path/to/your/model.json'))

  // Start the server
  await server.serve(8080, 
    defaultTasks.titanic, // with some tasks provided by Disco
    // or your own custom task
    customTask,)
}

runServer().catch(console.error)
