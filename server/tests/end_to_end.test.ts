// import fs from 'fs/promises'
// import path from 'node:path'
// import { Server } from 'node:http'
// import { Range } from 'immutable'
// import * as tf from '@tensorflow/tfjs-node'
//
// import { dataset, ConsoleLogger, training, TrainingSchemes, TrainingInformant, EmptyMemory, tasks } from 'discojs'
//
// import { getClient, startServer } from './utils'
//
// const SCHEME = TrainingSchemes.FEDERATED
//
// class NodeImageLoader extends dataset.ImageLoader<string> {
//   async readImageFrom (source: string): Promise<tf.Tensor3D> {
//     const image = await fs.readFile(source)
//     return tf.node.decodeImage(image) as tf.Tensor3D
//   }
// }
//
// class NodeTabularLoader extends dataset.TabularLoader<string> {
//   loadTabularDatasetFrom (source: string, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
//     return tf.data.csv(source, csvConfig)
//   }
// }
//
// describe('end to end', function () {
//   this.timeout(60_000)
//
//   let server: Server
//   before(async () => { server = await startServer() })
//   after(() => { server?.close() })
//
//   it('runs cifar 10 with two users', async () =>
//     await Promise.all([cifar10user(), cifar10user()]))
//
//   async function cifar10user (): Promise<void> {
//     const dir = '../discojs/example_training_data/CIFAR10/'
//     const files = (await fs.readdir(dir)).map((file) => path.join(dir, file))
//     const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()
//
//     const cifar10 = tasks.cifar10.task
//
//     const loaded = await new NodeImageLoader(cifar10).loadAll(files, { labels: labels })
//
//     const client = await getClient(server, cifar10)import fs from 'fs/promises'
// import path from 'node:path'
// import { Server } from 'node:http'
// import { Range } from 'immutable'
// import * as tf from '@tensorflow/tfjs-node'
//
// import { dataset, ConsoleLogger, training, TrainingSchemes, TrainingInformant, EmptyMemory, tasks } from 'discojs'
//
// import { getClient, startServer } from './utils'
//
// const SCHEME = TrainingSchemes.FEDERATED
//
// class NodeImageLoader extends dataset.ImageLoader<string> {
//   async readImageFrom (source: string): Promise<tf.Tensor3D> {
//     const image = await fs.readFile(source)
//     return tf.node.decodeImage(image) as tf.Tensor3D
//   }
// }
//
// class NodeTabularLoader extends dataset.TabularLoader<string> {
//   loadTabularDatasetFrom (source: string, csvConfig: Record<string, unknown>): tf.data.CSVDataset {
//     return tf.data.csv(source, csvConfig)
//   }
// }
//
// describe('end to end', function () {
//   this.timeout(60_000)
//
//   let server: Server
//   before(async () => { server = await startServer() })
//   after(() => { server?.close() })
//
//   it('runs cifar 10 with two users', async () =>
//     await Promise.all([cifar10user(), cifar10user()]))
//
//   async function cifar10user (): Promise<void> {
//     const dir = '../discojs/example_training_data/CIFAR10/'
//     const files = (await fs.readdir(dir)).map((file) => path.join(dir, file))
//     const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()
//
//     const cifar10 = tasks.cifar10.task
//
//     const loaded = await new NodeImageLoader(cifar10).loadAll(files, { labels: labels })
//
//     const client = await getClient(server, cifar10)
//     await client.connect()
//
//     const disco = new training.Disco(
//       cifar10,
//       new ConsoleLogger(),
//       new EmptyMemory(),
//       SCHEME,
//       new TrainingInformant(10, cifar10.taskID, SCHEME),
//       client
//     )
//
//     await disco.startTraining(loaded)
//   }
//
//   it('runs titanic with two users', async () =>
//     await Promise.all([titanicUser(), titanicUser()]))
//
//   async function titanicUser (): Promise<void> {
//     const dir = '../discojs/example_training_data/titanic.csv'
//
//     const titanic = tasks.titanic.task
//     const loaded = await (new NodeTabularLoader(titanic, ',').load(
//       'file://'.concat(dir),
//       {
//         features: titanic.trainingInformation?.inputColumns,
//         labels: titanic.trainingInformation?.outputColumns
//       }
//     ))
//
//     // TODO: loaded.size is null, will be fixed when we move to batches
//     const data = {
//       dataset: loaded,
//       size: 100
//     }
//
//     const client = await getClient(server, titanic)
//     await client.connect()
//
//     const disco = new training.Disco(
//       titanic,
//       new ConsoleLogger(),
//       new EmptyMemory(),
//       SCHEME,
//       new TrainingInformant(10, titanic.taskID, SCHEME),
//       client
//     )
//
//     await disco.startTraining(data)
//   }
// })
//
//     await client.connect()
//
//     const disco = new training.Disco(
//       cifar10,
//       new ConsoleLogger(),
//       new EmptyMemory(),
//       SCHEME,
//       new TrainingInformant(10, cifar10.taskID, SCHEME),
//       client
//     )
//
//     await disco.startTraining(loaded)
//   }
//
//   it('runs titanic with two users', async () =>
//     await Promise.all([titanicUser(), titanicUser()]))
//
//   async function titanicUser (): Promise<void> {
//     const dir = '../discojs/example_training_data/titanic.csv'
//
//     const titanic = tasks.titanic.task
//     const loaded = await (new NodeTabularLoader(titanic, ',').load(
//       'file://'.concat(dir),
//       {
//         features: titanic.trainingInformation?.inputColumns,
//         labels: titanic.trainingInformation?.outputColumns
//       }
//     ))
//
//     // TODO: loaded.size is null, will be fixed when we move to batches
//     const data = {
//       dataset: loaded,
//       size: 100
//     }
//
//     const client = await getClient(server, titanic)
//     await client.connect()
//
//     const disco = new training.Disco(
//       titanic,
//       new ConsoleLogger(),
//       new EmptyMemory(),
//       SCHEME,
//       new TrainingInformant(10, titanic.taskID, SCHEME),
//       client
//     )
//
//     await disco.startTraining(data)
//   }
// })
