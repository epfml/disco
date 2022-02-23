import app from '../../src/run_server'
import { agent as request } from 'supertest'
import { expect } from 'chai'

const platformID = 'feai'
const clientId = 'clientId'
const task = 'titanic'

const oldVersion = -1
const newVersion = 1
const weightsData = {
  weights: {
    data: [0, 1],
    version: newVersion
  }
}

const oldWeightsData = {
  weights: {
    data: [0, 1],
    version: oldVersion
  }
}

function connectHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/connect/${taskID}/${clientID}`
}

function disconnectHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/disconnect/${taskID}/${clientID}`
}

function postAsyncWeightHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/async/weights/${taskID}/${clientID}`
}

function getIsVersionOldHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/async/version/${taskID}/${clientID}`
}

describe(`${platformID} async connection tests`, () => {
  before(async () => {
    await request(app)
      .get(connectHeader(platformID, task, clientId))
      .expect(200)
  })

  after(async () => {
    await request(app)
      .get(disconnectHeader(platformID, task, clientId))
      .expect(200)
  })

  it('POST /async/weights', async () => {
    await request(app)
      .post(postAsyncWeightHeader(platformID, task, clientId))
      .send(weightsData)
      .expect(200)
  })

  it('POST /async/weights with old version returns 202', async () => {
    await request(app)
      .post(postAsyncWeightHeader(platformID, task, clientId))
      .send(oldWeightsData)
      .expect(202)
  })

  it('GET /async/version', async () => {
    await request(app)
      .get(getIsVersionOldHeader(platformID, task, clientId))
      .expect(200)
      .then(response => {
        expect(response.body.version).equal(0)
      })
  })
})
