import express, { Request, Response } from 'express'
import { Set } from 'immutable'

import { tf, serialization, isTask, Task, TaskID } from 'discojs'

import { Config } from '../config'
import { TasksAndModels } from '../tasks'

export class Tasks {
  private readonly ownRouter: express.Router

  private tasksAndModels = Set<[Task, tf.LayersModel]>()

  constructor (
    private readonly config: Config,
    tasksAndModels: TasksAndModels
  ) {
    this.ownRouter = express.Router()

    this.ownRouter.get('/', (req, res, next) => {
      this.getTasksMetadata(req, res).catch(next)
    })

    this.ownRouter.post('/', (req, res) => {
      const modelFile = req.body.modelFiles.modelFile
      const weightsFile = req.body.modelFiles.weightsFile
      const newTask = req.body
      if (
        typeof modelFile !== 'string' ||
        (weightsFile instanceof Uint8Array) ||
        !isTask(newTask)
      ) {
        res.status(400)
        return
      }

      // TODO load model from JSON and add it
      // this.tasksAndModels.addTaskAndModel(newTask, modelFile)
      console.warn('add model is a stub')

      res.end('Successfully upload')
    })

    // delay listening
    process.nextTick(() =>
      tasksAndModels.addListener('taskAndModel', (t, m) =>
        this.onNewTask(t, m)))
  }

  public get router (): express.Router {
    return this.ownRouter
  }

  onNewTask (task: Task, model: tf.LayersModel): void {
    this.ownRouter.get(`/${task.taskID}/:file`, (req, res, next) => {
      this.getLatestModel(task.taskID, req, res).catch(next)
    })

    this.tasksAndModels = this.tasksAndModels.add([task, model])
  }

  /**
   * Request handler called when a client sends a GET request asking for all the
   * tasks metadata stored in the server's tasks.json file. This is used for
   * generating the client's list of tasks. It requires no prior connection to the
   * server and is thus publicly available data.
   * @param {Request} request received from client
   * @param {Response} response sent to client
   */
  private async getTasksMetadata (request: Request, response: Response): Promise<void> {
    response
      .status(200)
      .send(this.tasksAndModels.map(([t, _]) => t).toArray())
  }

  /**
   * Request handler called when a client sends a GET request asking for the
   * TFJS model files of a given task. The files consist of the model's
   * architecture file model.json and its layer weights file weights.bin.
   * It requires no prior connection to the server and is thus publicly available
   * data.
   * @param {Request} request received from client
   * @param {Response} response sent to client
   */
  private async getLatestModel (taskID: TaskID, request: Request, response: Response): Promise<void> {
    const validModelFiles = Set.of('model.json', 'weights.bin')

    const file = request.params.file
    if (!validModelFiles.has(file)) {
      response.status(404)
      return
    }
    const taskAndModel = this.tasksAndModels.find(([t, _]) => t.taskID === taskID)
    if (taskAndModel === undefined) {
      response.status(404)
      return
    }

    const encoded = await serialization.model.encode(taskAndModel[1])

    response.status(200).send(encoded)
    console.log(`${file} download for task ${taskID} succeeded`)
  }
}
