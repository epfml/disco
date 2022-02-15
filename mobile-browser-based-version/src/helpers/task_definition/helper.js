import axios from 'axios'
import * as config from './task.config.js'
import _ from 'lodash'

function createTaskClass (task) {
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

function createTaskHelper (task) {
  const TaskHelper =
    config.TASK_INFO[task.trainingInformation.dataType].helperClass
  if (!TaskHelper) {
    console.log(`Task ${task.taskID} Helper cannot be created`)
    return
  }
  const taskHelper = new TaskHelper(task)
  return taskHelper
}

async function loadTasks (convert = false) {
  const tasksURL = process.env.VUE_APP_DEAI_SERVER.concat('tasks')
  const response = await axios.get(tasksURL)
  const rawTasks = response.data
  return convert ? _.map(rawTasks, createTaskClass) : rawTasks
}

function onFileLoad (filesElement, callback, readAs = 'text') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
      const res = await callback(e)
      resolve(res)
    };
    (readAs === 'text' ? reader.readAsText : reader.readAsDataURL)(
      filesElement
    )
  })
}

export { createTaskClass, createTaskHelper, loadTasks, onFileLoad }
