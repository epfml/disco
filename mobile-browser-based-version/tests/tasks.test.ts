/* eslint-disable no-unused-vars */
import { expect } from 'chai'
import { loadTasks } from '../src/helpers/task_definition/helper'

const nbrTasks = 4

describe('Load tasks test', () => { // the tests container
  before(() => {
    process.env.NODE_ENV = 'development'
    // Load .env.development
    require('dotenv-flow').config()
  })

  it('load tasks', async () => {
    const tasks = await loadTasks()
    expect(tasks.length).equal(nbrTasks)
  })

  it('load titanic', async () => {
    const tasks = await loadTasks()
    const titanicTask = tasks[0]
  })
})
