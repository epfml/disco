import express from 'express'
import expressWS from 'express-ws'
import { Set } from 'immutable'

import { Task } from 'discojs'

import * as handlers from './federated'
import { writeNewTask, getTasks } from '../tasks/tasks_io'
import { CONFIG } from '../config'
import { SignalingServer } from './signaling_server'

import models from '../tasks/models'

export class Router {
  private tasks = Set<Task>()

  // TODO choose between federated and/or decentralised

  async init (): Promise<express.Router> {
    this.tasks = await getTasks(CONFIG.tasksFile)
    // TODO store models
    await Promise.all(models.map(async (create) => await create()))

    const wsApplier = expressWS(express())
    const signalingServer = new SignalingServer()

    const tasksRouter = this.setupTasksRouter(wsApplier, signalingServer)
    const federatedRouter = this.setupFederatedRouter(tasksRouter)
    const decentralisedRouter = this.setupDecentralizedRouter(tasksRouter)

    const router = express.Router()
    wsApplier.applyTo(router)

    router.use('/deai', decentralisedRouter)
    router.use('/feai', federatedRouter)
    router.get('/', (_, res, next) => {
      res.send('Server for DeAI & FeAI')
      next()
    })

    return router
  }

  private setupTasksRouter (wsApplier: expressWS.Instance, signalingServer: SignalingServer): express.Router {
    const router = express.Router()
    wsApplier.applyTo(router)

    router.get('/', handlers.getTasksMetadata)

    router.post('/', (req, res, next) => {
      const modelFile = req.body.modelFiles.modelFile
      const weightsFile = req.body.modelFiles.weightsFile
      const newTask = req.body
      if (
        typeof modelFile !== 'string' ||
        (weightsFile instanceof Uint8Array) ||
        !Task.isTask(newTask)
      ) {
        res.status(400)
        return
      }
      if (this.tasks.map((t) => t.taskID).contains(newTask.taskID)) {
        console.log('task already existing')
        res.status(400)
        return
      }

      writeNewTask(this.tasks, newTask, modelFile, weightsFile, CONFIG).catch(next)
      this.tasks = this.tasks.add(newTask)
      console.log(`new task: ${newTask.taskID}`)

      router.ws(`/${newTask.taskID}`, (ws) => signalingServer.handle(newTask.taskID, ws))

      res.end('Successfully upload')
    })

    router.ws('/:task', (ws, req) => {
      const task = this.tasks.find((task) => task.taskID === req.params.task)
      if (task === undefined) {
        ws.close(undefined, 'no such task')
        return
      }

      signalingServer.handle(task.taskID, ws)
    })

    router.get('/:task/:file', handlers.getLatestModel)

    return router
  }

  private setupFederatedRouter (tasksRouter: express.Router): express.Router {
    const router = express.Router()
    router.get('/', (_, res) => res.send('FeAI server'))

    router.get('/connect/:task/:id', handlers.connect)
    router.get('/disconnect/:task/:id', handlers.disconnect)

    router.post('/weights/:task/:id', (req, res, next) => {
      handlers.postWeights(req, res).catch(next)
    })

    router.get('/round/:task/:id', (req, res, next) => {
      handlers.getRound(req, res).catch(next)
    })
    router.get('/weights/:task/:id', (req, res, next) => {
      handlers.getWeightsHandler(req, res).catch(next)
    })

    router.get('/statistics/:task/:id', (req, res, next) => {
      handlers.getAsyncWeightInformantStatistics(req, res).catch(next)
    })

    router
      .route('/metadata/:metadata/:task/:round/:id')
      .get(handlers.getMetadataMap)
      .post(handlers.postMetadata)

    router.get('/logs', handlers.queryLogs)

    router.use('/tasks', tasksRouter)

    return router
  }

  private setupDecentralizedRouter (tasksRouter: express.Router): express.Router {
    const router = express.Router()

    router.use('/tasks', tasksRouter)
    router.get('/', (_, res) => res.send('DeAI server'))

    return router
  }
}
