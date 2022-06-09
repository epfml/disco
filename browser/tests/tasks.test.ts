import { expect } from 'chai'
import { loadTasks } from '../src/tasks'

// TODO this is hard coded
const nbrTasks = 5

describe('Load tasks test', () => { // the tests container
  it('load tasks', async () => {
    const tasks = await loadTasks()
    expect(tasks.size).equal(nbrTasks)
  })

  it('load titanic', async () => {
    const tasks = await loadTasks()
    expect(tasks.map((t) => t.taskID).toArray()).to.contain('titanic')
  })
})
