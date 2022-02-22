import app from '../../src/run_server'
import { agent as request } from 'supertest'
import { expect } from 'chai'

const platformID = 'feai'
const clientId = 'clientId'
const task = 'titanic'

const oldTimeStamp = -1
const newTimeStamp = 1
const weightsData = {
  weights: {
    data: [0, 1],
    timeStamp: newTimeStamp
  }
}

const oldWeightsData = {
  weights: {
    data: [0, 1],
    timeStamp: oldTimeStamp
  }
}

function connectHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/connect/${taskID}/${clientID}`
}

function postAsyncWeightHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/asyncWeights/${taskID}/${clientID}`
}

function getAreWeightsOutOfDateWeightHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/areWeightsOutOfDate/${taskID}/${clientID}`
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

  it('check old timeStamp getAreWeightsOutOfDateWeightHeader', async () => {
    await request(app)
      .get(getAreWeightsOutOfDateWeightHeader(platformID, task, clientId))
      .send({ timeStamp: oldTimeStamp })
      .expect(200)
      .then(response => {
        expect(response.body.isTimeStampOutOfDate).true
      })
  })
  it('check new timeStamp getAreWeightsOutOfDateWeightHeader', async () => {
    await request(app)
      .get(getAreWeightsOutOfDateWeightHeader(platformID, task, clientId))
      .send({ timeStamp: newTimeStamp })
      .expect(200)
      .then(response => {
        expect(response.body.isTimeStampOutOfDate).false
      })
  })
})
