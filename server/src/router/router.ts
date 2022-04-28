import express from 'express'
import expressWS from 'express-ws'

import { Task } from 'discojs'

import * as handlers from './federated'
import { writeNewTask, getTasks } from '../tasks/tasks_io'
import { CONFIG } from '../config'
import { SignalingServer } from './signaling_server'

// enable websocket
const wsApplier = expressWS(express())

const tasks = getTasks(CONFIG.tasksFile)

// WebSocket server
const signalingServer = new SignalingServer()

// General tasks routes
const tasksRouter = express.Router()
wsApplier.applyTo(tasksRouter)

tasksRouter.get('/', handlers.getTasksMetadata)
// POST method route (task-creation-form)
tasksRouter.post('/', (req, res, next) => {
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
  if (newTask.taskID in tasks) {
    console.log('Cannot add new task (key is already defined in Tasks.json)')
    res.status(400)
    return
  }

  // create new task and server
  tasks.then((ts) => ts.push(newTask)).catch(next)
  console.log(`new task: ${newTask.taskID as string}`)
  tasksRouter.ws(`/${newTask.taskID as string}`, (ws) => signalingServer.handle(newTask.taskID, ws))
  // store results in json file
  writeNewTask(newTask, modelFile, weightsFile, CONFIG).catch(next)
  // answer vue app
  res.end('Successfully upload')
})

tasksRouter.ws('/:task', (ws, req, next) => {
  tasks.then(async () => {
    const task = (await tasks).find((task) => task.taskID === req.params.task)
    if (task === undefined) {
      ws.close(undefined, 'no such task')
      return
    }
    signalingServer.handle(task.taskID, ws)
  }).catch(next)
})

tasksRouter.get('/:task/:file', handlers.getLatestModel)

// Declare federated routes
const federatedRouter = express.Router()
federatedRouter.get('/', (_, res) => res.send('FeAI server'))

federatedRouter.get('/connect/:task/:id', handlers.connect)
federatedRouter.get('/disconnect/:task/:id', handlers.disconnect)

federatedRouter.post('/weights/:task/:id', (req, res, next) => {
  handlers.postWeights(req, res).catch(next)
})

federatedRouter.get('/round/:task/:id', (req, res, next) => {
  handlers.getRound(req, res).catch(next)
})
federatedRouter.get('/statistics/:task/:id', handlers.getAsyncWeightInformantStatistics)

federatedRouter
  .route('/metadata/:metadata/:task/:round/:id')
  .get(handlers.getMetadataMap)
  .post(handlers.postMetadata)

federatedRouter.get('/logs', handlers.queryLogs)

federatedRouter.use('/tasks', tasksRouter)

// =======================================================================

// Declaire decentralised routes
const decentralisedRouter = express.Router()
wsApplier.applyTo(decentralisedRouter)

decentralisedRouter.use('/tasks', tasksRouter)
decentralisedRouter.get('/', (_, res) => res.send('DeAI server'))

export { federatedRouter, decentralisedRouter }
