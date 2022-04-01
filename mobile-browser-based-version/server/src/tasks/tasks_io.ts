import fs from 'fs'
import { Task } from './task'

let tasks: Task[] = []

function getTasks (tasksFile: string): Task[] {
  // Load tasks only if they have not been yet loaded.
  if (tasks.length > 0) {
    return tasks
  }

  if (!fs.existsSync(tasksFile)) {
    throw new Error(`Could not read from tasks file ${tasksFile}`)
  }

  const jsonTasks = JSON.parse(
    fs.readFileSync(tasksFile) as unknown as string
  )

  tasks = jsonTasks as Task[]

  return tasks
}

function writeNewTask (newTask, modelFile, weightsFile, config) {
  // store results in json file
  fs.writeFile(config.tasksFile, JSON.stringify(tasks), (err) => {
    if (err) console.log('Error writing file:', err)
  })
  // synchronous directory creation so that next call to fs.writeFile doesn't fail.
  fs.mkdirSync(config.modelDir(newTask.taskID), { recursive: true })
  fs.writeFile(
    config.modelFile(newTask.taskID),
    JSON.stringify(modelFile),
    (err) => {
      if (err) console.log('Error writing file:', err)
    }
  )
  fs.writeFile(
    config.modelWeights(newTask.taskID),
    weightsFile,
    (err) => {
      if (err) console.log('Error writing file:', err)
    }
  )
}

export { writeNewTask, getTasks }
