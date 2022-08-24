import express from 'express'
import expressWS from 'express-ws'

import { tf, Task, TrainingSchemes } from '@epfml/discojs'

import { TasksAndModels } from '../tasks'
import { SignalingServer } from './signaling_server'
// import { addDifferentialPrivacy } from '@/../../discojs/dist/privacy'

export class Decentralized {
  private readonly ownRouter: expressWS.Router
  private readonly signalingServer = new SignalingServer()

  constructor (
    wsApplier: expressWS.Instance,
    tasksAndModels: TasksAndModels
  ) {
    this.ownRouter = express.Router()
    wsApplier.applyTo(this.ownRouter)

    this.ownRouter.get('/', (_, res) => res.send('DeAI server\n'))

    // delay listener because this (object) isn't fully constructed yet. The lambda function inside process.nextTick is executed after the current operation on the JS stack runs to completion and before the event loop is allowed to continue.
    /* this.onNewTask is registered as a listener to tasksAndModels, which has 2 consequences:
    - this.onNewTask is executed on all the default tasks (which are already loaded in tasksAndModels)
    - Every time a new task and model are added to tasksAndModels, this.onNewTask is executed on them.
    For every task and model, this.onNewTask creates a path /taskID and routes it to this.signalingServer.handle.
    */
    process.nextTick(() =>
      tasksAndModels.addListener('taskAndModel', (t, m) =>
        this.onNewTask(t, m)))
  }

  public get router (): express.Router {
    return this.ownRouter
  }

  private onNewTask (task: Task, _: tf.LayersModel): void {
    const decentralizedInformation = task.clientInformation.scheme === TrainingSchemes.DECENTRALIZED ? task.clientInformation : undefined
    this.ownRouter.ws(`/${task.taskID}`, (ws, _) =>
      this.signalingServer.handle(task.taskID, ws, decentralizedInformation))
  }
}
