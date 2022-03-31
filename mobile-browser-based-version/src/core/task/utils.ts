import { Task } from './task'
import axios from 'axios'
import _ from 'lodash'
import * as tf from '@tensorflow/tfjs'

/**
 * TODO: @s314cy
 * Should be considered as a regular API call and regrouped accordingly, it does
 * not belong to this file.
 */
export async function loadTasks (): Promise<Array<Task>> {
  const tasksURL = process.env.VUE_APP_FEAI_SERVER.concat('tasks')
  const response = await axios.get(tasksURL)
  const rawTasks = response.data
  return _.map(rawTasks, (task) => new Task(task.taskID, task.displayInformation, task.trainingInformation))
}

/**
 * TODO: @s314cy
 * Should be considered as a regular API call and regrouped accordingly, it does
 * not belong to this file.
 */
export async function getLatestModel (taskID: string): Promise<any> {
  return await tf.loadLayersModel(process.env.VUE_APP_FEAI_SERVER.concat(`tasks/${taskID}/model.json`))
}
