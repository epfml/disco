import express from 'express'
import expressWS from 'express-ws'
import * as tf from '@tensorflow/tfjs'

import { Task } from 'discojs'

import { TasksAndModels } from '../tasks'
import { SignalingServer } from './signaling_server'

export class Decentralized {
  private readonly ownRouter: expressWS.Router
  private readonly signalingServer = new SignalingServer()

  constructor (
    wsApplier: expressWS.Instance,
    tasksAndModels: TasksAndModels
  ) {
    this.ownRouter = express.Router()
    wsApplier.applyTo(this.ownRouter)

    this.ownRouter.get('/', (_, res) => res.send('DeAI server'))

    // delay listener
    process.nextTick(() =>
      tasksAndModels.addListener('taskAndModel', (t, m) =>
        this.onNewTask(t, m)))
  }

  public get router (): express.Router {
    return this.ownRouter
  }

  private onNewTask (task: Task, model: tf.LayersModel): void {
    this.ownRouter.ws(`/${task.taskID}`, (ws, _) =>
      this.signalingServer.handle(task.taskID, ws)
    )
  }
}
