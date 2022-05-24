import axios from 'axios'
import * as tf from '@tensorflow/tfjs'

import { Task } from 'discojs'

import { CONFIG } from './config'

/**
 * TODO: @s314cy
 * Should be considered as a regular API call and regrouped accordingly, it does
 * not belong to this file.
 */
export async function loadTasks (): Promise<Task[]> {
  const url = new URL('', CONFIG.serverUrl.href)
  url.pathname += 'feai/tasks'

  const response = await axios.get(url.href)
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
  const url = new URL('', CONFIG.serverUrl.href)
  url.pathname += `feai/tasks/${taskID}/model.json`

  return await tf.loadLayersModel(url.href)
}
