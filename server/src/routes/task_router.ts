import createDebug from "debug";
import type { Request, Response } from 'express'
import express from 'express'
import { Set } from 'immutable'

import type { Model, Task, TaskID } from '@epfml/discojs'
import { serialization, isTask } from '@epfml/discojs'

import type { TaskInitializer } from '../task_initializer.js'

const debug = createDebug("server:router:task_router");

export class TaskRouter {
  readonly #expressRouter: express.Router

  #tasksAndModels = Set<[Task, Model]>()

  constructor (taskInitializer: TaskInitializer) {
    this.#expressRouter = express.Router()

    // Return available tasks upon GET requests
    this.#expressRouter.get('/', (_, res) => {
      res
        .status(200)
        .send(this.#tasksAndModels.map(([t, _]) => t).toArray())
    })

    // POST request to add a new task
    this.#expressRouter.post('/', (req, res) => {
      const raw: unknown = req.body
      if (typeof raw !== 'object' || raw === null) return res.status(400)
      const { model: encoded, newTask }: Partial<Record<'model' | 'newTask', unknown>> = raw

      if (!(
        encoded !== undefined &&
        newTask !== undefined &&
        isTask(newTask)
      )) {
        res.status(400)
        return
      }

      serialization.model
        .decode(encoded)
        .then((model) => taskInitializer.addTask(newTask, model))
        .then(() => res.status(200).end("Successful task upload"))
        .catch((e) => {
          debug("while adding model: %o", e);
          res.status(500);
        });
    })

    // delay listener because `this` (object) isn't fully constructed yet
    process.nextTick(() => {
      // a 'newTask' event is emitted when a new task is added 
      taskInitializer.on('newTask', (t, m) => { this.onNewTask(t, m) })
    })
  }

  public get router (): express.Router {
    return this.#expressRouter
  }

  // Register a new GET request for the new task
  onNewTask(task: Task, model: Model): void {
    this.#expressRouter.get(`/${task.id}/:file`, (req, res, next) => {
      this.getLatestModel(task.id, req, res).catch(next)
    })

    this.#tasksAndModels = this.#tasksAndModels.add([task, model])
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
    const taskAndModel = this.#tasksAndModels.find(([t, _]) => t.id === id)
    if (taskAndModel === undefined) {
      response.status(404)
      return
    }

    const encoded = await serialization.model.encode(taskAndModel[1])

    response.status(200).send(encoded)
    debug(`${file} download for task ${id} succeeded`)
  }
}
