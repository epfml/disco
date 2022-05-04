import { Task } from 'discojs'

import axios from 'axios'
import * as tf from '@tensorflow/tfjs'

/**
 * TODO: @s314cy
 * Should be considered as a regular API call and regrouped accordingly, it does
 * not belong to this file.
 */
export async function loadTasks (): Promise<Task[]> {
  const tasksURL = process.env.VUE_APP_FEAI_SERVER.concat('tasks')
  const response = await axios.get(tasksURL)
  const tasks: unknown = response.data

  if (!Array.isArray(tasks) || !tasks.every(Task.isTask)) {
    throw new Error('invalid tasks response')
  }

  return tasks
}

/**
 * TODO: @s314cy
 * Should be considered as a regular API call and regrouped accordingly, it does
 * not belong to this file.
 */
export async function getLatestModel (taskID: string): Promise<any> {
  return await tf.loadLayersModel(process.env.VUE_APP_FEAI_SERVER.concat(`tasks/${taskID}/model.json`))
}
