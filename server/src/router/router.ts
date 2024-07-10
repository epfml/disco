import createDebug from "debug";
import express from 'express'
import type expressWS from 'express-ws'

import type { Config } from '../config.js'
import type { TasksAndModels } from '../tasks.js'

import { Federated } from './federated/index.js'
import { Decentralized } from './decentralized/index.js'
import { Tasks } from './tasks.js'

const debug = createDebug("server:router");

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
          debug("connection refused on %s", req.url);
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
