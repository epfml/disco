import { List, Set } from 'immutable'
import { createHash } from 'node:crypto'
import fs from 'node:fs'

import { tf, type Task, type Path, type Digest, isTaskProvider, type TaskProvider, defaultTasks } from '@epfml/discojs-node'

// default tasks and added ones
// register 'taskAndModel' event to get tasks
// TODO save and load from disk
export class TasksAndModels {
  private listeners = List<(t: Task, m: tf.LayersModel) => void>()
  tasksAndModels = Set<[Task, tf.LayersModel]>()

  on (_: 'taskAndModel', callback: (t: Task, m: tf.LayersModel) => void): void {
    this.tasksAndModels.forEach(([t, m]) => { callback(t, m) })
    this.listeners = this.listeners.push(callback)
  }

  emit (_: 'taskAndModel', task: Task, model: tf.LayersModel): void {
    this.listeners.forEach((listener) => { listener(task, model) })
  }

  async loadDefaultTasks (): Promise<void> {
    const tasks = Object.values<TaskProvider>(defaultTasks)
    await Promise.all(tasks.map(async (t: TaskProvider) => {
      await this.addTaskAndModel(t)
    }))
  }

  // Returns already saved model in priority, then the model from the task definition
  private async loadModelFromTask (task: Task | TaskProvider): Promise<tf.LayersModel> {
    const discoTask = isTaskProvider(task) ? task.getTask() : task
    let model: tf.LayersModel | undefined

    const modelPath = `./models/${discoTask.taskID}/`
    if (fs.existsSync(modelPath)) {
      // either a model has already been trained, or the pretrained
      // model has already been downloaded
      return await tf.loadLayersModel(`file://${modelPath}/model.json`)
    } else {
      const modelURL = discoTask.trainingInformation.modelURL
      if (modelURL !== undefined) {
        model = await tf.loadLayersModel(modelURL)
      } else if (isTaskProvider(task)) {
        model = await task.getModel()
      } else {
        throw new Error('model not provided in task definition')
      }
    }

    fs.mkdirSync(modelPath, { recursive: true })
    await model.save(`file://${modelPath}`)

    // Check digest if provided
    if (discoTask.digest !== undefined) {
      try {
        this.checkDigest(discoTask.digest, modelPath)
      } catch (e) {
        TasksAndModels.removeModelFiles(modelPath)
        throw e
      }
    }

    return model
  }

  private checkDigest (digest: Digest, modelPath: Path): void {
    const hash = createHash(digest.algorithm)
    const modelConfigRaw = fs.readFileSync(`${modelPath}/model.json`)

    const modelConfig = JSON.parse(modelConfigRaw.toString())
    const weightsFiles = modelConfig.weightsManifest[0].paths
    if (!(
      Array.isArray(weightsFiles) &&
      typeof weightsFiles[0] === 'string'
    )) {
      throw new Error()
    }
    weightsFiles.forEach((file: string) => {
      const data = fs.readFileSync(`${modelPath}/${file}`)
      hash.update(data)
    })

    const computedDigest = hash.digest('base64')
    if (computedDigest !== digest.value) {
      console.warn(`digest was\n ${computedDigest}\nbut expected\n${digest.value}`)
      throw new Error('digest mismatch')
    } else {
      console.info('digest verified')
    }
  }

  async addTaskAndModel (task: Task | TaskProvider, model?: tf.LayersModel | URL): Promise<void> {
    let tfModel: tf.LayersModel
    let discoTask: Task

    if (isTaskProvider(task)) {
      discoTask = task.getTask()
    } else {
      discoTask = task
    }

    if (model === undefined) {
      tfModel = await this.loadModelFromTask(task)
    } else if (model instanceof tf.LayersModel) {
      tfModel = model
    } else if (model instanceof URL) {
      tfModel = await tf.loadLayersModel(model.href)
    } else {
      throw new Error('invalid model')
    }

    this.tasksAndModels = this.tasksAndModels.add([discoTask, tfModel])
    this.emit('taskAndModel', discoTask, tfModel)
  }

  static removeModelFiles (path: Path): void {
    console.warn('removing nodel files at', path)
    fs.rm(path, { recursive: true, force: true }, (err) => {
      if (err !== null) console.error(err)
    })
  }
}
