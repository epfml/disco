/* eslint-disable no-unused-vars */
import { expect } from 'chai'
import { loadTasks } from '../src/helpers/task_definition/helper'

// TODO this is hard coded
const nbrTasks = 4

describe('Load tasks test', () => { // the tests container
  it('load tasks', async () => {
    const tasks = await loadTasks()
    expect(tasks.length).equal(nbrTasks)
  })

  it('load titanic', async () => {
    const tasks = await loadTasks()
    const titanicTask = tasks[0]
  })
})
