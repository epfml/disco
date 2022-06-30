import * as http from 'http'
import { URL } from 'url'
import {Weights} from '../src/types'
import { client as clients, tasks } from '../src'
import * as tf from '@tensorflow/tfjs'
import {TrainingInformant} from '../src/training_informant'
import {TrainingSchemes} from '../src/training/training_schemes'
import { Server } from 'node:http'
import { getClient, startServer } from '/Users/alyssaunell/disco/server/tests/utils'

function makeWeights (values: any): Weights {
  const w: Weights = []
  for (let i = 0; i < 1; i++) {
    w.push(tf.tensor(values))
  }
  return w
}

describe('decentralized client test one round', function () {
  let server: http.Server
  before(async () => { server = await startServer() })
  after(() => { server?.close() })
  const TASK = tasks.cifar10.task

    const client_URL: URL = new URL('http://www.example.com')

    const client1: clients.InsecureDecentralized = new clients.InsecureDecentralized(client_URL, TASK)
    const client2: clients.InsecureDecentralized = new clients.InsecureDecentralized(client_URL, TASK)
    const client3: clients.InsecureDecentralized = new clients.InsecureDecentralized(client_URL, TASK)

    const updatedWeights1: Weights = makeWeights([1,10,3])
    const updatedWeights2: Weights = makeWeights([4,5,6])
    const updatedWeights3: Weights = makeWeights([10,0,6])

    const trainingInformant1: TrainingInformant = new TrainingInformant(0,'0',TrainingSchemes.DECENTRALIZED)

    client1.connectNewPeer(1, true)
    client2.connectNewPeer(1, true)
    client3.connectNewPeer(1, true) //how to connect clients

    client1.onRoundEndCommunication(updatedWeights1, updatedWeights1, 0, trainingInformant1)
    client2.onRoundEndCommunication(updatedWeights2, updatedWeights2, 0, trainingInformant1)
    const result = client3.onRoundEndCommunication(updatedWeights3, updatedWeights3, 0, trainingInformant1)
    return result
})
// console.log(testDecentralized())