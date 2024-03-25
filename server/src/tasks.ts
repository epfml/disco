import { List, Set } from 'immutable'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-node'

import { Task, Path, Digest, TaskProvider, isTask } from '@epfml/discojs-core'
import { Model, defaultTasks, models, serialization } from '@epfml/discojs-core'

// default tasks and added ones
// register 'taskAndModel' event to get tasks
// TODO save and load from disk
export class TasksAndModels {
  private listeners = List<(t: Task, m: Model) => void>()
  tasksAndModels = Set<[Task, Model]>()

  on (_: 'taskAndModel', callback: (t: Task, m: Model) => void): void {
    this.tasksAndModels.forEach(([t, m]) => { callback(t, m) })
    this.listeners = this.listeners.push(callback)
  }

  emit (_: 'taskAndModel', task: Task, model: Model): void {
    this.listeners.forEach((listener) => { listener(task, model) })
  }

  async loadDefaultTasks (): Promise<void> {
    const tasks = Object.values<TaskProvider>(defaultTasks)
    await Promise.all(tasks.map(async (t: TaskProvider) => {
      await this.addTaskAndModel(t)
    }))
  }

  // Returns already saved model in priority, then the model from the task definition
  private async loadModelFromTask (task: Task | TaskProvider): Promise<Model> {
    const discoTask = isTask(task) ? task : task.getTask()
    let model: Model | undefined

    const modelPath = `./models/${discoTask.id}/`
    try {
      const content = await fs.readFile(`${modelPath}/model.json`)
      return await serialization.model.decode(content)
    } catch {
      // unable to read file, continuing
    }

    if (isTask(task)) {
      throw new Error('saved model not found and no way to get it')
    } else {
      model = await task.getModel()
    }

    await fs.mkdir(modelPath, { recursive: true })
    const encoded = await serialization.model.encode(model)
    await fs.writeFile(`${modelPath}/model.json`, encoded)

    // Check digest if provided
    if (discoTask.digest !== undefined) {
      try {
        await this.checkDigest(discoTask.digest, modelPath)
      } catch (e) {
        console.warn('removing nodel files at', modelPath)
        await fs.rm(modelPath, { recursive: true, force: true })
        throw e
      }
    }

    return model
  }

  private async checkDigest (digest: Digest, modelPath: Path): Promise<void> {
    const hash = createHash(digest.algorithm)
    const modelConfigRaw = await fs.readFile(`${modelPath}/model.json`)

    const parsedModelConfig: unknown = JSON.parse(modelConfigRaw.toString())

    if (typeof parsedModelConfig !== 'object' || parsedModelConfig === null) {
      throw new Error('invalid model config')
    }
    const { weightsManifest }: Partial<Record<'weightsManifest', unknown>> = parsedModelConfig

    if (!Array.isArray(weightsManifest) || weightsManifest.length === 0) {
      throw new Error('invalid weights manifest')
    }
    const manifest: unknown = weightsManifest[0]

    if (typeof manifest !== 'object' || manifest === null) {
      throw new Error('invalid weight manifest')
    }
    const { paths: weightsFiles }: Partial<{ paths: unknown }> = manifest

    if (!(
      Array.isArray(weightsFiles) &&
      typeof weightsFiles[0] === 'string'
    )) {
      throw new Error("invalud weights files")
    }
    await Promise.all(weightsFiles.map(async (file: string) => {
      const data = await fs.readFile(`${modelPath}/${file}`)
      hash.update(data)
    }))

    const computedDigest = hash.digest('base64')
    if (computedDigest !== digest.value) {
      console.warn(`digest was\n ${computedDigest}\nbut expected\n${digest.value}`)
      throw new Error('digest mismatch')
    } else {
      console.info('digest verified')
    }
  }

  async addTaskAndModel (task: Task | TaskProvider, model?: Model | URL): Promise<void> {
    let discoTask: Task
    if (isTask(task)) {
      discoTask = task
    } else {
      discoTask = task.getTask()
    }

    let tfModel: Model
    if (model === undefined) {
      tfModel = await this.loadModelFromTask(task)
    } else if (model instanceof Model) {
      tfModel = model
    } else if (model instanceof URL) {
      tfModel = new models.TFJS(await tf.loadLayersModel(model.href))
    } else {
      throw new Error('invalid model')
    }

    this.tasksAndModels = this.tasksAndModels.add([discoTask, tfModel])
    this.emit('taskAndModel', discoTask, tfModel)
  }
}
