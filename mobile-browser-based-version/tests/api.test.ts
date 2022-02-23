import { expect } from 'chai'
import * as api from '../src/helpers/communication/federated/api'

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

  it('getAsyncVersion', async () => {
    await api.connect(task, user)
    const resp = await api.getAsyncVersion(task, user)
    expect(resp.data.version).equal(0)
    await api.disconnect(task, user)
  })

  it('getAsyncVersion at server init', async () => {
    await api.connect(task, user)
    const resp = await api.getAsyncVersion(task, user)
    expect(resp.data.version).equal(0)
    await api.disconnect(task, user)
  })
})
