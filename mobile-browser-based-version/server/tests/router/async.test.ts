import app from '../../src/run_server'
import { agent as request } from 'supertest'

const platformID = 'feai'
const clientId = 'clientId'
const task = 'titanic'
const weightsData = {
  weights: {
    data: [0, 1],
    timeStamp: 1
  }
}

const oldWeightsData = {
  weights: {
    data: [0, 1],
    weightTimeStamp: -1
  }
}

function connectHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/connect/${taskID}/${clientID}`
}

function postAsyncWeightHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/asyncWeights/${taskID}/${clientID}`
}

describe('async connection tests', () => {
  it('connect to task', async () => {
    await request(app)
      .get(connectHeader(platformID, task, clientId))
      .expect(200)
  })

  it('post weights', async () => {
    await request(app)
      .post(postAsyncWeightHeader(platformID, task, clientId))
      .send(weightsData)
      .expect(200)
  })

  it('post old weights returns 202', async () => {
    await request(app)
      .post(postAsyncWeightHeader(platformID, task, clientId))
      .send(oldWeightsData)
      .expect(202)
  })
})
