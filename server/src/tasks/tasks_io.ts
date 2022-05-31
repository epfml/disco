import fs from 'fs/promises'
import { Set } from 'immutable'

import { Path, Task } from 'discojs'

import { Config } from '../config'

async function getTasks (tasksFile: Path): Promise<Set<Task>> {
  const fileContent = await fs.readFile(tasksFile, 'utf8')
  const loadedTasks: unknown = JSON.parse(fileContent)
  if (!Array.isArray(loadedTasks) || !loadedTasks.every(Task.isTask)) {
    throw new Error('invalid file loaded')
  }
  const tasks = loadedTasks

  return Set(tasks)
}

// TODO better types
async function writeNewTask (otherTasks: Set<Task>, task: Task, modelFile: unknown, weightsFile: Uint8Array, config: Config): Promise<void> {
  const tasks = otherTasks.add(task)

  // store results in json file
  await fs.writeFile(config.tasksFile, JSON.stringify(tasks.toArray()))

  // synchronous directory creation so that next call to fs.writeFile doesn't fail.
  await fs.mkdir(config.modelDir(task.taskID), { recursive: true })
  await fs.writeFile(config.modelFile(task.taskID), JSON.stringify(modelFile))
  await fs.writeFile(config.modelWeights(task.taskID), weightsFile)
}

export { writeNewTask, getTasks }
