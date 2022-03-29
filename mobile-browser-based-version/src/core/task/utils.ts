import { Task } from './task'
import axios from 'axios'
import _ from 'lodash'
import * as tf from '@tensorflow/tfjs'

/**
 * TODO: @s314cy
 * Should be considered as a regular API call and regrouped accordingly, it does
 * not belong to this file.
 */
export async function loadTasks () {
  const tasksURL = process.env.VUE_APP_FEAI_SERVER.concat('tasks')
  const response = await axios.get(tasksURL)
  const rawTasks = response.data
  return _.map(rawTasks, (task) => new Task(task.taskID, task.displayInformation, task.trainingInformation))
}

/**
 * TODO: @s314cy
 * Can be removed.
 */
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

/**
 * TODO: @s314cy
 * Should be considered as a regular API call and regrouped accordingly, it does
 * not belong to this file.
 */
export async function getLatestModel (taskID: string): Promise<any> {
  return await tf.loadLayersModel(process.env.VUE_APP_FEAI_SERVER.concat(`tasks/${taskID}/model.json`))
}
