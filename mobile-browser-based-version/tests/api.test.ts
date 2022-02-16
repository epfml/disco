import { expect } from 'chai'
import * as api from '../src/helpers/communication/federated/api'

const task = 'titanic'
const user = 'a'
const nonValidTask = 'nonValidTask'

describe('API test', () => { // the tests container
  it('Connect to valid task', () => {
    api.connect(task, user).then((resp) => {
      expect(resp.ok).true
    })
  })

  it('disconnect from valid task', () => {
    api.disconnect(task, user).then((resp) => {
      expect(resp.ok).true
    })
  })

  it('Connect to non valid task', () => {
    api.connect(nonValidTask, user).then((resp) => {
      expect(resp.ok).false
    })
  })
})
