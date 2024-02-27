import axios from 'axios'
import { Map } from 'immutable'

import { serialization, type tf, WeightsContainer } from '..'
import { isTask, type Task, type TaskID } from './task'

const TASK_ENDPOINT = 'tasks'

export async function pushTask (
  url: URL,
  task: Task,
  model: tf.LayersModel
): Promise<void> {
  await axios.post(
    url.href + TASK_ENDPOINT,
    {
      task,
      model: await serialization.model.encode(model),
      weights: await serialization.weights.encode(WeightsContainer.from(model))
    }
  )
}

export async function fetchTasks (url: URL): Promise<Map<TaskID, Task>> {
  const response = await axios.get(new URL(TASK_ENDPOINT, url).href)
  const tasks: unknown = response.data

  if (!(Array.isArray(tasks) && tasks.every(isTask))) {
    throw new Error('invalid tasks response')
  }

  return Map(tasks.map((t) => [t.taskID, t]))
}
