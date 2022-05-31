import cors from 'cors'
import express from 'express'
import expressWS from 'express-ws'

import { CONFIG } from './config'
import { Router } from './router'
import { TasksAndModels } from './tasks'

// TODO better name?
export async function getApp (): Promise<express.Application> {
  const tasksAndModels = await TasksAndModels.init()

  // enable websocket
  const wsApplier = expressWS(express(), undefined, { leaveRouterUntouched: true })
  const app = wsApplier.app

  app.enable('trust proxy')
  app.use(cors())
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: false }))

  const baseRouter = new Router(wsApplier, tasksAndModels, CONFIG)
  app.use('/', baseRouter.router)

  return app
}
