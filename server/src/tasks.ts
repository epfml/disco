import { Set, Map } from 'immutable'
import { EventEmitter } from 'node:events'
import * as tf from '@tensorflow/tfjs'
import path from 'path'

import { tasks as defaultTasks, Task } from '@epfml/discojs'
import { CONFIG } from './config'

const simpleFaceModelPath = path.join(CONFIG.modelsDir, 'mobileNetV2_35_alpha_2_classes', 'model.json')

// TODO, to add a custom model for a task, add the path here
const MODEL_PATH = Map<string, string>()
  .set(defaultTasks.simple_face.task.taskID, simpleFaceModelPath)

// default tasks and added ones
// register 'taskAndModel' event to get tasks
// TODO save and load from disk
export class TasksAndModels extends EventEmitter {
  private tasksAndModels = Set<[Task, tf.LayersModel]>()

  // use init() instead
  private constructor () {
    super({ captureRejections: true })

    this.on('newListener', (event, listener) => {
      if (event !== 'taskAndModel') {
        throw new Error('unknown event')
      }
      this.tasksAndModels.forEach(([t, m]) => listener(t, m))
    })
  }

  static async init (): Promise<TasksAndModels> {
    const ret = new TasksAndModels()

    const tasks = await Promise.all(Object.values(defaultTasks))
    await Promise.all(tasks.map(async (i) =>
      ret.addTaskAndModel(i.task, await i.model(MODEL_PATH.get(i.task.taskID) ?? ''))))

    return ret
  }

  addTaskAndModel (task: Task, model: tf.LayersModel): void {
    this.tasksAndModels = this.tasksAndModels.add([task, model])
    this.emit('taskAndModel', task, model)
  }
}
