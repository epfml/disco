import axios from 'axios'
import { Set } from 'immutable'

import { isTask, Task } from '@epfml/discojs'

import { CONFIG } from './config'

/**
 * TODO: @s314cy
 * Should be considered as a regular API call and regrouped accordingly, it does
 * not belong to this file.
 */
export async function loadTasks (): Promise<Set<Task>> {
  const url = new URL('', CONFIG.serverUrl.href)
  url.pathname += 'tasks'

  const response = await axios.get(url.href)
  const tasks: unknown = response.data

  if (!Array.isArray(tasks) || !tasks.every(isTask)) {
    throw new Error('invalid tasks response')
  }

  return Set(tasks)
}
