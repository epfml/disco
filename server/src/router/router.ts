import express from 'express'
import expressWS from 'express-ws'

import { Config } from '../config'
import { TasksAndModels } from '../tasks'

import { Federated } from './federated'
import { Decentralized } from './decentralized'
import { Tasks } from './tasks'

export class Router {
  // TODO choose between federated and/or decentralized

  private readonly ownRouter: expressWS.Router

  constructor (
    wsApplier: expressWS.Instance,
    private readonly tasksAndModels: TasksAndModels,
    private readonly config: Config
  ) {
    const tasks = new Tasks(this.config, this.tasksAndModels)
    const federated = new Federated(wsApplier, this.tasksAndModels)
    const decentralized = new Decentralized(wsApplier, this.tasksAndModels)

    this.ownRouter = express.Router()
    wsApplier.applyTo(this.ownRouter)

    process.nextTick(() =>
      wsApplier.getWss().on('connection', (ws, req) => {
        if (!federated.isValidUrl(req.url) && !decentralized.isValidUrl(req.url)) {
          ws.terminate()
          ws.close()
        }
      })
    )

    this.ownRouter.get('/', (_, res, next) => {
      res.send('Server for DeAI & FeAI \n')
      next()
    })
    this.ownRouter.use('/deai', decentralized.router)
    this.ownRouter.use('/feai', federated.router)
    this.ownRouter.use('/tasks', tasks.router)
  }

  get router (): express.Router {
    return this.ownRouter
  }
}
