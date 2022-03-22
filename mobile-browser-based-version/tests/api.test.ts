import { expect } from 'chai'
import * as api from '../src/logic/communication/federated/federated_api'

const task = 'titanic'
const user = 'a'
const nonValidTask = 'nonValidTask'

describe('api test', () => { // the tests container
  it('connect to valid task', async () => {
    expect((await api.connect(task, user)).status).equal(200)
  })

  it('disconnect from valid task', async () => {
    expect((await api.disconnect(task, user)).status).equal(200)
  })

  it('Connect to non valid task', async () => {
    api.connect(nonValidTask, user).catch(function (error) {
      expect(error.response.status).equal(404)
    })
  })

  it('getRound', async () => {
    await api.connect(task, user)
    const resp = await api.getRound(task, user)
    expect(resp.data.round).greaterThanOrEqual(0) // Since the server you are running might have trained and round > 0
    await api.disconnect(task, user)
  })
})
