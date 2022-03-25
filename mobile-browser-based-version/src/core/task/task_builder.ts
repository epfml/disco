import * as config from './task.config'

export function createTaskClass (task) {
  const TaskClass =
    config.TASK_INFO[task.trainingInformation.dataType].frameClass
  if (!TaskClass) {
    console.log(`Task ${task.taskID} was not processed`)
    return
  }
  const newTaskFrame = new TaskClass(
    task.taskID,
    task.displayInformation,
    task.trainingInformation
  )
  return newTaskFrame
}

export function createTaskHelper (task) {
  const TaskHelper =
    config.TASK_INFO[task.trainingInformation.dataType].helperClass
  if (!TaskHelper) {
    console.log(`Task ${task.taskID} Helper cannot be created`)
    return
  }
  const taskHelper = new TaskHelper(task)
  return taskHelper
}
