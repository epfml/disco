/* eslint-disable no-unused-vars */
import { expect } from 'chai'
import { loadTasks } from '../src/helpers/task_definition/helper'
import Trainer from '../src/helpers/training/trainer'
import { CsvTaskHelper } from '../src/helpers/task_definition/csv/helper'
import { logger } from '../src/helpers/logging/ConsoleLogger'

const platform = 'feai'

describe('train test', () => { // the tests container
  it('connect to titanic task', async () => {
    const tasks = await loadTasks()
    const task = tasks[0]
    const helper = new CsvTaskHelper(task)
    const trainer = new Trainer(task, platform, logger, helper)
    await trainer.connectClientToServer().then((isConnected) => expect(isConnected).true)
  })
})
