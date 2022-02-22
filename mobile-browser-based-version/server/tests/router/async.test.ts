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

function postAsyncWeightHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/asyncWeights/${taskID}/${clientID}`
}

function getIsVersionOldHeader (platformID: string, taskID: string, clientID: string) {
  return `/${platformID}/isVersionOld/${taskID}/${clientID}`
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

  it('isOldVersion true for new version', async () => {
    await request(app)
      .get(getIsVersionOldHeader(platformID, task, clientId))
      .send({ version: oldVersion })
      .expect(200)
      .then(response => {
        expect(response.body.versionIsOld).true
      })
  })
  it('isOldVersion false for old version', async () => {
    await request(app)
      .get(getIsVersionOldHeader(platformID, task, clientId))
      .send({ version: newVersion })
      .expect(200)
      .then(response => {
        expect(response.body.versionIsOld).false
      })
  })
})
