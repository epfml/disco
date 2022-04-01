import express from 'express'
import expressWS from 'express-ws'
import _ from 'lodash'
import * as handlers from '../logic/federated/request_handlers'
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
tasksRouter.post('/', function (req, res) {
  const newTask = req.body
  if (newTask.taskID in tasks) { console.log('Cannot add new task (key is already defined in Tasks.json)') } else {
    // extract model file from tasks
    const modelFile = _.cloneDeep(newTask.modelFiles.modelFile)
    const weightsFile = _.cloneDeep(newTask.modelFiles.weightsFile)
    _.unset(newTask, 'modelFiles')
    _.unset(newTask, 'weightsFiles')
    // create new task and server
    tasks.push(newTask)
    console.log(`new task: ${newTask.taskID}`)
    tasksRouter.ws(`/${newTask.taskID}`, (ws) => signalingServer.handle(newTask, ws))
    // store results in json file
    writeNewTask(newTask, modelFile, weightsFile, CONFIG)
    // answer vue app
    res.end('Successfully upload')
  }
})

tasksRouter.ws('/:task', (ws, req) => {
  const task = tasks.find((task) => task.taskID === req.params.task)
  if (task === undefined) {
    ws.close(undefined, 'no such task')
    return
  }
  signalingServer.handle(task.taskID, ws)
})

tasksRouter.get('/:task/:file', handlers.getLatestModel)

// Declare federated routes
const federatedRouter = express.Router()
federatedRouter.get('/', (_, res) => res.send('FeAI server'))

federatedRouter.get('/connect/:task/:id', handlers.connect)
federatedRouter.get('/disconnect/:task/:id', handlers.disconnect)

federatedRouter.post('/weights/:task/:id', handlers.postWeights)

federatedRouter.get('/round/:task/:id', handlers.getRound)
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
