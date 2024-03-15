import type { Request, Response } from 'express'
import express from 'express'
import { Set } from 'immutable'

import type { Model, Task, TaskID } from '@epfml/discojs-core'
import { serialization, isTask } from '@epfml/discojs-core'

import type { Config } from '../config.js'
import type { TasksAndModels } from '../tasks.js'

export class Tasks {
  private readonly ownRouter: express.Router

  private tasksAndModels = Set<[Task, Model]>()

  constructor (
    private readonly config: Config,
    tasksAndModels: TasksAndModels
  ) {
    this.ownRouter = express.Router()

    this.ownRouter.get('/', (req, res, next) => {
      this.getTasksMetadata(req, res).catch(next)
    })

    this.ownRouter.post('/', (req, res) => {
      const model = req.body.model
      const newTask = req.body.task

      if (!(
        model !== undefined &&
        newTask !== undefined &&
        isTask(newTask)
      )) {
        res.status(400)
        return
      }

      serialization.model.decode(model)
        .then(async (model) => {
          await tasksAndModels.addTaskAndModel(newTask, model)
        })
        .then(() => res.status(200).end('Successful task upload'))
        .catch(console.error)
    })

    // delay listening
    process.nextTick(() => {
      tasksAndModels.on('taskAndModel', (t, m) => { this.onNewTask(t, m) })
    })
  }

  public get router (): express.Router {
    return this.ownRouter
  }

  onNewTask (task: Task, model: Model): void {
    this.ownRouter.get(`/${task.id}/:file`, (req, res, next) => {
      this.getLatestModel(task.id, req, res).catch(next)
    })

    this.tasksAndModels = this.tasksAndModels.add([task, model])
  }

  /**
   * Request handler called when a client sends a GET request asking for all the
   * tasks metadata stored in the server's tasks.json file. This is used for
   * generating the client's list of tasks. It requires no prior connection to the
   * server and is thus publicly available data.
   * @param request received from client
   * @param response sent to client
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
   * @param request received from client
   * @param response sent to client
   */
  private async getLatestModel (id: TaskID, request: Request, response: Response): Promise<void> {
    const validModelFiles = Set.of('model.json', 'weights.bin')

    const file = request.params.file
    if (!validModelFiles.has(file)) {
      response.status(404)
      return
    }
    const taskAndModel = this.tasksAndModels.find(([t, _]) => t.id === id)
    if (taskAndModel === undefined) {
      response.status(404)
      return
    }

    const encoded = await serialization.model.encode(taskAndModel[1])

    response.status(200).send(encoded)
    console.log(`${file} download for task ${id} succeeded`)
  }
}
