import cors from 'cors'
import express from 'express'
import expressWS from 'express-ws'

import { Router } from './router'

// TODO better name?
export async function getApp (): Promise<express.Application> {
  // enable websocket
  const app = expressWS(express()).app

  app.enable('trust proxy')
  app.use(cors())
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: false }))

  const router = new Router()
  app.use('/', await router.init())

  return app
}
