import axios from 'axios'
import { Map } from 'immutable'

import type { Model } from '../index.js'
import { serialization } from '../index.js'

import type { Task, TaskID } from './task.js'
import { isTask } from './task.js'

const TASK_ENDPOINT = 'tasks'

export async function pushTask (
  url: URL,
  task: Task,
  model: Model
): Promise<void> {
  await axios.post(
    url.href + TASK_ENDPOINT,
    {
      task,
      model: await serialization.model.encode(model),
      weights: await serialization.weights.encode(model.weights)
    }
  )
}

export async function fetchTasks (url: URL): Promise<Map<TaskID, Task>> {
  const response = await axios.get(new URL(TASK_ENDPOINT, url).href)
  const tasks: unknown = response.data

  if (!Array.isArray(tasks)) {
    throw new Error('Expected to receive an array of Tasks when fetching tasks')
  } else if (!tasks.every(isTask)) {
    for (const task of tasks) {
      if (!isTask(task)) {
        console.error("task has invalid format:", task)  
      }
    }
    throw new Error('invalid tasks response, the task object received is not well formatted')
  }

  return Map(tasks.map((t) => [t.id, t]))
}
