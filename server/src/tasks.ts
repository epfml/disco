import { Set } from 'immutable'
import { EventEmitter } from 'node:events'
import fs from 'fs'

import { tf, tasks as defaultTasks, Task } from '@epfml/discojs-node'

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
    await Promise.all(tasks.map(async (i) => {
      let model: tf.LayersModel | undefined
      const modelPath = `./models/${i.task.taskID}/`
      if (fs.existsSync(modelPath)) {
        // either a model has already been trained, or the pretrained
        // model has already been downloaded
        model = await tf.loadLayersModel(`file://${modelPath}/model.json`)
      } else {
        // otherwise, init the task's model and save it
        try {
          model = await i.model()
        } catch (e: any) {
          console.error(e instanceof Error ? e.message : e.toString())
          return
        }
        await model.save(`file://${modelPath}`)
      }
      ret.addTaskAndModel(i.task, model)
    }))

    return ret
  }

  addTaskAndModel (task: Task, model: tf.LayersModel): void {
    this.tasksAndModels = this.tasksAndModels.add([task, model])
    this.emit('taskAndModel', task, model)
  }
}
