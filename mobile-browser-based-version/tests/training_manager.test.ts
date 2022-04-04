/* eslint-disable no-unused-vars */
import { loadTasks } from '../src/core/task/tasks_io'
import { TrainingManager } from '../src/core/training/training_manager'
import { CsvTaskHelper } from '../src/core/task/csv/csv_task_helper'
import { logger } from '../src/core/logging/console_logger'
import { Platform } from '../src/platforms/platform'

const platform = Platform.federated

describe('train test', () => { // the tests container
  it('connect/disconnect to titanic task', async () => {
    const useIndexedDB = false
    const tasks = await loadTasks()
    const task = tasks[0]
    const helper = new CsvTaskHelper(task)
    const trainer = new TrainingManager(task, platform, logger, helper, useIndexedDB)
    await trainer.connectClientToServer()
    await trainer.disconnect()
  })
})
