/* eslint-disable no-unused-vars */
import { loadTasks } from '../src/helpers/task_definition/helper'
import axios from 'axios'

describe('Load tasks test', () => { // the tests container
  it('Connect to valid task', async () => {
    const tasksURL = 'http://localhost:8080/deai/tasks'
    console.log(tasksURL)
    const response = await axios.get(tasksURL)
    const rawTasks = response.data
  })

  it('conne', async () => {
    const response = await loadTasks()
    const rawTasks = response.data
    console.log(rawTasks)
  })
})
