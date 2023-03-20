import express, { type NextFunction, type Request, type Response } from 'express'
import type expressWS from 'express-ws'

import { type Config } from '../config.js'
import { type TasksAndModels } from '../tasks.js'

import { Federated } from './federated.js'
import { Decentralized } from './decentralized/index.js'
import { Tasks } from './tasks.js'
import { DatasetController } from './controllers/dataset.controller.js'

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
          console.log('Connection refused')
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
    if (config.useDatabase) {
      this.ownRouter.use('/dataset/', DatasetController)
    }

    // Custom JSON error handler
    this.ownRouter.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error(err.stack)
      res.status(500).json({ error: err.message })
    })
  }

  get router (): express.Router {
    return this.ownRouter
  }
}
