import tf from '@tensorflow/tfjs-node'

import type { TaskProvider } from '@epfml/discojs'
import { defaultTasks, models } from '@epfml/discojs'
import { Server as DiscoServer } from 'server'

// Define your own task provider (task definition + model)
const customTask: TaskProvider<"tabular"> = {
  getTask () {
    return Promise.resolve({
      id: 'custom-task',
      dataType: "tabular",
      displayInformation: {
        title: 'Custom task',
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
        inputColumns: [
          'Age'
        ],
        outputColumn: 'Output',
        scheme: 'federated',
        minNbOfParticipants: 2,
        tensorBackend: 'tfjs',
        noiseScale: undefined,
        clippingRadius: undefined
      }
    });
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

async function runServer(): Promise<void> {
  // Create a server
  const server = await DiscoServer.with(
    defaultTasks.titanic, // with some tasks provided by Disco
    customTask, // or your own custom task
  );

  // Start the server
  await server.serve(8080);
}

runServer().catch(console.error)
