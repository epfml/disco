/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
// import app from '../src/run_server'
import * as api from '../src/test/api'

/** Source for test setup:
 * https://dev.to/matteobruni/mocha-chai-with-typescript-37f
 */

const ids = ['a', 'b', 'c']
const task = 'titanic'
const nonExistingTask = 'non_existing_task'

describe('Connection tests', () => { // the tests container
  it('connect to valid task', async () => { // the single test
    const response = await api.connect(task, ids[0])

    expect(response.ok).to.be.true
  })

  it('connect to non existing task', async () => { // the single test
    const response = await api.connect(nonExistingTask, ids[0])

    expect(response.ok).to.be.false
  })
})
