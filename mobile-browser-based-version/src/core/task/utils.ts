import { Task } from './task'
import axios from 'axios'
import _ from 'lodash'

// should be considered as a regular API call and regrouped accordingly, it does
// not belong to this file
export async function loadTasks (convert = false) {
  const tasksURL = process.env.VUE_APP_FEAI_SERVER.concat('tasks')
  console.log('task url', tasksURL)
  const response = await axios.get(tasksURL)
  const rawTasks = response.data
  return convert ? _.map(rawTasks, ({ id, trainInfo, displayInfo }) => new Task(id, trainInfo, displayInfo)) : rawTasks
}

export function onFileLoad (filesElement, callback, readAs = 'text') {
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
