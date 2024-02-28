import express from 'express'
import type expressWS from 'express-ws'
import type WebSocket from 'ws'
import type tf from '@tensorflow/tfjs'

import type { Task } from '@epfml/discojs-node'

import type { TasksAndModels } from '../tasks'

export abstract class Server {
  private readonly ownRouter: expressWS.Router

  private readonly tasks: string[] = new Array<string>()
  private readonly UUIDRegexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi

  constructor (wsApplier: expressWS.Instance, tasksAndModels: TasksAndModels) {
    this.ownRouter = express.Router()
    wsApplier.applyTo(this.ownRouter)

    this.ownRouter.get('/', (_, res) => res.send(this.description + '\n'))

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

  private onNewTask (task: Task, model: tf.LayersModel): void {
    this.tasks.push(task.taskID)
    this.initTask(task, model)

    this.ownRouter.ws(this.buildRoute(task), (ws, req) => {
      if (this.isValidUrl(req.url)) {
        this.handle(task, ws, model, req)
      } else {
        ws.terminate()
        ws.close()
      }
    })
  }

  protected isValidTask (taskId: string): boolean {
    return this.tasks.filter(e => e === taskId).length === 1
  }

  protected isValidClientId (clientId: string): boolean {
    return new RegExp(this.UUIDRegexExp).test(clientId)
  }

  protected isValidWebSocket (urlEnd: string): boolean {
    return urlEnd === '.websocket'
  }

  public abstract isValidUrl (url?: string): boolean

  protected abstract readonly description: string

  protected abstract buildRoute (task: Task): string

  protected abstract initTask (task: Task, model: tf.LayersModel): void

  protected abstract handle (
    task: Task,
    ws: WebSocket,
    model: tf.LayersModel,
    req: express.Request,
  ): void
}
