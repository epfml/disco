import { Set } from 'immutable'
import { EventEmitter } from 'node:events'
import { createHash } from 'node:crypto'
import fs from 'node:fs'

import { tf, tasks as defaultTasks, Task, Path } from '@epfml/discojs-node'

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
        const modelURL = i.task.trainingInformation.modelURL
        const digest = i.task.digest
        try {
          if (modelURL !== undefined) {
            model = await tf.loadLayersModel(modelURL)
          } else if ('model' in i && typeof i.model === 'function') {
            model = await i.model()
          } else {
            console.warn('could not infer model from provided task object:', i.task.taskID)
            return
          }
        } catch (e: any) {
          console.error(e instanceof Error ? e.message : e.toString())
          return
        }

        fs.mkdirSync(modelPath, { recursive: true })
        await model.save(`file://${modelPath}`)

        if (modelURL !== undefined && digest !== undefined) {
          let weightsFiles: string | string[]
          try {
            const hash = createHash(digest.algorithm)
            const modelConfigRaw = fs.readFileSync(`${modelPath}/model.json`)

            const modelConfig = JSON.parse(modelConfigRaw.toString())
            weightsFiles = modelConfig.weightsManifest[0].paths
            if (!(
              Array.isArray(weightsFiles) &&
              typeof weightsFiles[0] === 'string'
            )) {
              throw new Error()
            }
            weightsFiles.forEach((file) => {
              const data = fs.readFileSync(`${modelPath}/${file}`)
              hash.update(data)
            })

            const computedDigest = hash.digest('base64')
            if (computedDigest !== digest.value) {
              console.warn('digest for', i.task.taskID, 'was\n', computedDigest, '\nbut expected\n', digest.value)
              TasksAndModels.removeModelFiles(modelPath)
              return
            } else {
              console.log('verified digest for', i.task.taskID)
            }
          } catch {
            console.warn('could not compute digest for', i.task.taskID)
            TasksAndModels.removeModelFiles(modelPath)
            return
          }
        }
      }
      ret.addTaskAndModel(i.task, model)
    }))

    return ret
  }

  addTaskAndModel (task: Task, model: tf.LayersModel): void {
    this.tasksAndModels = this.tasksAndModels.add([task, model])
    this.emit('taskAndModel', task, model)
  }

  static removeModelFiles (path: Path): void {
    console.warn('removing nodel files at', path)
    fs.rm(path, { recursive: true, force: true }, (err) => {
      if (err !== null) console.error(err)
    })
  }
}
