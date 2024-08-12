import express from 'express'
import type expressWS from 'express-ws'
// import type WebSocket from 'ws'

import type { Model, Task, TaskID } from '@epfml/discojs'

import type { TasksAndModels } from '../tasks.js'
import { TrainingController, FederatedController, DecentralizedController } from '../controllers/index.js'

/**
 * The TrainingRouter handles client requests related the federated
 * and decentralized training.
 * Handles websocket setup but the actual logic is deferred to the controller
 */
export class TrainingRouter {
  private readonly ownRouter: expressWS.Router

  private readonly tasks = new Set<string>()
  private readonly UUIDRegexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi

  protected readonly description: string
  
  constructor(private readonly trainingScheme: 'federated' | 'decentralized',
    wsApplier: expressWS.Instance, tasksAndModels: TasksAndModels) {
    this.ownRouter = express.Router()
    wsApplier.applyTo(this.ownRouter)

    this.ownRouter.get('/', (_, res) => res.send(this.description + '\n'))

    this.description = `Disco ${this.trainingScheme} server`
    // delay listener because this (object) isn't fully constructed yet. The lambda function inside process.nextTick is executed after the current operation on the JS stack runs to completion and before the event loop is allowed to continue.
    /* this.onNewTask is registered as a listener to tasksAndModels, which has 2 consequences:
        - this.onNewTask is executed on all the default tasks (which are already loaded in tasksAndModels)
        - Every time a new task and model are added to tasksAndModels, this.onNewTask is executed on them.
        For every task and model, this.onNewTask creates a path /taskID and routes it to this.handle.
        */
    process.nextTick(() => {
      tasksAndModels.on('taskAndModel', (t, m) => { this.onNewTask(t, m) })
    })
  }

  public get router (): express.Router {
    return this.ownRouter
  }

  private initController(task: Task): TrainingController {
    return this.trainingScheme == 'federated' ?
      new FederatedController(task)
      : new DecentralizedController(task)
  }

  // Register the task and setup the controller to handle
  // websocket connections
  private onNewTask (task: Task, model: Model): void {
    this.tasks.add(task.id)
    // The controller handles the actual logic of collaborative training
    // in its `handle` method. Each task has a dedicated controller which
    // handles the training logic of this task only
    const taskController = this.initController(task)
    taskController.initTask(model)

    // Setup a websocket route which calls the controller's `handle` method
    this.ownRouter.ws(this.buildRoute(task.id), (ws, req) => {
      if (this.isValidUrl(req.url)) {
        taskController.handle(ws, model, req)
      } else {
        ws.terminate()
        ws.close()
      }
    })
  }

  protected isValidTask (id: string): boolean {
    return this.tasks.has(id)
  }

  protected isValidClientId (clientId: string): boolean {
    return new RegExp(this.UUIDRegexExp).test(clientId)
  }

  protected isValidWebSocket (urlEnd: string): boolean {
    return urlEnd === '.websocket'
  }

  protected buildRoute (task: TaskID): string {
    return `/${task}`
  }

  public isValidUrl (url: string | undefined): boolean {
    const splittedUrl = url?.split('/')

    return (
      splittedUrl !== undefined &&
      splittedUrl.length === 3 &&
      splittedUrl[0] === '' &&
      this.isValidTask(splittedUrl[1]) &&
      this.isValidWebSocket(splittedUrl[2])
    )
  }
}
