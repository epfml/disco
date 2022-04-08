import fs from 'fs/promises'

import { Config } from '../config'
import { Task } from './task'
import { Path } from '../types'

// TODO avoid state
let tasks: Task[] = []

async function getTasks (tasksFile: Path): Promise<Task[]> {
  // Load tasks only if they have not been yet loaded.
  if (tasks.length > 0) {
    return tasks
  }

  const fileContent = await fs.readFile(tasksFile, 'utf8')
  const loadedTasks: unknown = JSON.parse(fileContent)
  if (!Array.isArray(loadedTasks) || !loadedTasks.every(Task.isTask)) {
    throw new Error('invalid file loaded')
  }

  tasks = loadedTasks

  return tasks
}

// TODO better types
async function writeNewTask (newTask: Task, modelFile: unknown, weightsFile: Uint8Array, config: Config): Promise<void> {
  // store results in json file
  await fs.writeFile(config.tasksFile, JSON.stringify(tasks))

  // synchronous directory creation so that next call to fs.writeFile doesn't fail.
  await fs.mkdir(config.modelDir(newTask.taskID), { recursive: true })
  await fs.writeFile(config.modelFile(newTask.taskID), JSON.stringify(modelFile))
  await fs.writeFile(config.modelWeights(newTask.taskID), weightsFile)
}

export { writeNewTask, getTasks }
