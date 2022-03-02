/* eslint-disable no-unused-vars */
import { expect } from 'chai'
import { loadTasks } from '../src/logic/task_definition/tasks_io'
import TrainingManager from '../src/logic/training/training_manager'
import { CsvTaskHelper } from '../src/logic/task_definition/csv/csv_task_helper'
import { logger } from '../src/logic/logging/console_logger'

const platform = 'feai'

describe('train test', () => { // the tests container
  it('connect/disconnect to titanic task', async () => {
    const useIndexedDB = false
    const tasks = await loadTasks()
    const task = tasks[0]
    const helper = new CsvTaskHelper(task)
    const trainer = new TrainingManager(task, platform, logger, helper, useIndexedDB)
    await trainer.connectClientToServer().then((isConnected) => expect(isConnected).true)
    await trainer.disconnect()
  })
})
