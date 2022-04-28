import { expect } from 'chai'
import { agent as request } from 'supertest'

import app from '../../src/run_server'

const platformID = 'feai'
const clientId = 'clientId'
const task = 'titanic'

const oldRound = -1
const newRound = 1
const weightsData = {
  weights: [0, 1],
  round: newRound
}

const oldWeightsData = {
  weights: [0, 1],
  round: oldRound
}

function connectHeader (platformID: string, taskID: string, clientID: string): string {
  return `/${platformID}/connect/${taskID}/${clientID}`
}

function disconnectHeader (platformID: string, taskID: string, clientID: string): string {
  return `/${platformID}/disconnect/${taskID}/${clientID}`
}

function postWeightHeader (platformID: string, taskID: string, clientID: string): string {
  return `/${platformID}/weights/${taskID}/${clientID}`
}

function getisRoundOldHeader (platformID: string, taskID: string, clientID: string): string {
  return `/${platformID}/round/${taskID}/${clientID}`
}

describe(`${platformID} connection tests`, () => {
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

  it('POST /weights', async () => {
    await request(app)
      .post(postWeightHeader(platformID, task, clientId))
      .send(weightsData)
      .expect(200)
  })

  it('POST /weights with old round returns 202', async () => {
    await request(app)
      .post(postWeightHeader(platformID, task, clientId))
      .send(oldWeightsData)
      .expect(202)
  })

  it('GET /round', async () => {
    await request(app)
      .get(getisRoundOldHeader(platformID, task, clientId))
      .expect(200)
      .then(response => {
        expect(response.body.round).equal(0)
      })
  })
})
