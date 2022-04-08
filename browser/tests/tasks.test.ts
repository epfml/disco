/* eslint-disable no-unused-vars */
import { assert, expect } from 'chai'
import { loadTasks } from '../src/tasks'

// TODO this is hard coded
const nbrTasks = 4

describe('Load tasks test', () => { // the tests container
  it('load tasks', async () => {
    const tasks = await loadTasks()
    expect(tasks.length).equal(nbrTasks)
  })

  it('load titanic', async () => {
    const tasks = await loadTasks()
    assert.strictEqual(tasks[0]?.taskID, 'titanic')
  })
})
