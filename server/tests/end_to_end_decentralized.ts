import fs from 'fs/promises'
import path from 'node:path'
import { Server } from 'node:http'
import { Range } from 'immutable'
import * as tf from '@tensorflow/tfjs-node'

import { dataset, ConsoleLogger, training, TrainingSchemes, TrainingInformant, EmptyMemory, tasks, client, Weights } from 'discojs'

import { getClient, startServer } from './utils'
// import { expect } from 'chai'

const SCHEME = TrainingSchemes.DECENTRALIZED

class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom (source: string): Promise<tf.Tensor3D> {
    const image = await fs.readFile(source)
    return tf.node.decodeImage(image) as tf.Tensor3D
  }
}

function makeWeights (values: any): Weights {
  const w: Weights = []
  for (let i = 0; i < 1; i++) {
    w.push(tf.tensor(values))
  }
  return w
}

describe('end to end', function () {
  this.timeout(50_000)

  let server: Server
  beforeEach(async () => {
    server = await startServer()
  })
  afterEach(() => {
    server?.close()
  })

  // it('Connect 2 clients to titanic and check that they connect to each other.',
  //     async () => {
  //       const result = await titanicConnectTest()
  //       expect(result).to.equal(true)
  //     }
  // )
  //
  // async function titanicUser(): Promise<CLIENT_TYPE> {
  //   const titanic = tasks.titanic.task
  //
  //   const cli = await getClient(CLIENT_CONSTRUCTOR, server, titanic)
  //   await cli.connect()
  //   return cli
  // }
  //
  // async function titanicConnectTest(): Promise<boolean> {
  //   const clients = await Promise.all([titanicUser(), titanicUser()])
  //
  //   await new Promise<void>(resolve => setTimeout(resolve, CONNECTION_TIMEOUT))
  //   console.log('\n---------------------------\n')
  //   for (const i in clients) {
  //     // eslint-disable-next-line @typescript-eslint/no-base-to-string
  //     console.log('client', i, 'is connected to peers:', clients[i].getPeerIDs().toString())
  //     console.log('\n')
  //   }
  //   return (clients[0].getPeerIDs().size === 1 && clients[1].getPeerIDs().size === 1)
  // }

  // it('runs cifar 10 with three decentralized users', async () =>
  //   await Promise.all([cifar10user(), cifar10user(), cifar10user()]))
  //
  // async function cifar10user (): Promise<void> {
  //   const dir = '../discojs/example_training_data/CIFAR10/'
  //   const files = (await fs.readdir(dir)).map((file) => path.join(dir, file))
  //   const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()
  //
  //   const cifar10 = tasks.cifar10.task
  //
  //   const loaded = await new NodeImageLoader(cifar10).loadAll(files, { labels: labels })
  //
  //   const cli = await getClient(client.InsecureDecentralized, server, cifar10)
  //   await cli.connect()
  //
  //   const disco = new training.Disco(
  //     cifar10,
  //     new ConsoleLogger(),
  //     new EmptyMemory(),
  //     SCHEME,
  //     new TrainingInformant(10, cifar10.taskID, SCHEME),
  //     cli
  //   )
  //   await disco.startTraining(loaded)
  // }

  it('decentralized client test one round', async () => {
    const result: Weights = await testWeightSharingInsecure()
    // const expected: Weights = makeWeights([6, 7, 13])
    tf.print(result[0])
  }
    // expect(result).to.equal(expected)}
  )

  /*
    makes client to connect to server and share input weights
     */
  async function makeClient (input: number[]): Promise<Weights> {
    const TASK = tasks.cifar10.task
    const clientCurrent: client.DecentralizedClearText = await getClient(client.DecentralizedClearText, server, TASK)
    const weights: Weights = makeWeights(input)
    const trainingInformant1: TrainingInformant = new TrainingInformant(0, '0', TrainingSchemes.DECENTRALIZED)
    await clientCurrent.connect()
    return await clientCurrent.onRoundEndCommunication(weights, weights, 0, trainingInformant1)
  }
/* eslint-disable */
  async function testWeightSharingInsecure (): Promise<Weights> {
    // expected --> [6, 7, 13]
    makeClient([3, 3, 3])
    makeClient([4, 5, 6])
    return await makeClient([11, 13, 30])
  }
  /* eslint-enable */

  it('runs cifar 10 with three secure decentralized users', async () =>
    await Promise.all([cifar10userSec(), cifar10userSec(), cifar10userSec()]))

  async function cifar10userSec (): Promise<void> {
    const dir = '../discojs/example_training_data/CIFAR10/'
    const files = (await fs.readdir(dir)).map((file) => path.join(dir, file))
    const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()

    const cifar10 = tasks.cifar10.task

    const loaded = await new NodeImageLoader(cifar10).loadAll(files, { labels: labels })

    const cli = await getClient(client.DecentralizedSecAgg, server, cifar10)
    await cli.connect()

    const disco = new training.Disco(
      cifar10,
      new ConsoleLogger(),
      new EmptyMemory(),
      SCHEME,
      new TrainingInformant(10, cifar10.taskID, SCHEME),
      cli
    )
    await disco.startTraining(loaded)
  }

  it('decentralized client secure test one round', async () => {
    const result: Weights = await testWeightSharingSecure()
    // const expected: Weights = makeWeights([6, 7, 13])
    tf.print(result[0])
  }
    // expect(result).to.equal(expected)}
  )

  /*
    makes client to connect to server and share input weights
     */
  async function makeClientSecure (input: number[]): Promise<Weights> {
    const TASK = tasks.cifar10.task
    const clientCurrent: client.DecentralizedSecAgg = await getClient(client.DecentralizedSecAgg, server, TASK)
    const weights: Weights = makeWeights(input)
    const trainingInformant1: TrainingInformant = new TrainingInformant(0, '0', TrainingSchemes.DECENTRALIZED)
    await clientCurrent.connect()
    return await clientCurrent.onRoundEndCommunication(weights, weights, 0, trainingInformant1)
  }
/* eslint-disable */
  async function testWeightSharingSecure (): Promise<Weights> {
    // expected --> [6, 7, 13]
    makeClientSecure([3, 3, 3])
    makeClientSecure([4, 5, 6])
    return await makeClientSecure([11, 13, 30])
  }
  /* eslint-enable */
}
)
