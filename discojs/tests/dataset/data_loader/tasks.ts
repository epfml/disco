import { readFile } from 'fs/promises'
import { Task } from '../../../src'

const TASKS_FILE = './tasks/tasks.json'

// TODO copied from server
export async function loadTasks (): Promise<Task[]> {
  const fileContent = await readFile(TASKS_FILE, 'utf8')
  const loadedTasks: unknown = JSON.parse(fileContent)

  if (!Array.isArray(loadedTasks) || !loadedTasks.every(Task.isTask)) {
    throw new Error('invalid file loaded')
  }

  return loadedTasks
}
