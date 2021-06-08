const express               = require('express')
const fs                    = require('fs')
const { ExpressPeerServer } = require('peer')
const { makeId }            = require('./helpers.js')
const { models }            = require('./models.js')


const app = express()
const server = app.listen(3000)

// Set up peer server
const peerServer = ExpressPeerServer(server, {
    path: '/peers',
    key: 'api',
    allow_discovery: true,
    generateClientId: makeId(12)
})

// Load task descriptions
const TASKS_PATH = 'src/server/tasks.json'
const tasks = JSON.parse(fs.readFileSync(TASKS_PATH))

// Set up tasks router
const tasksRouter = express.Router()
tasksRouter.get('/', (req, res) => res.send(tasks))
tasks.forEach(task => {
    tasksRouter.get('/' + task.taskId, (req, res) => res.send(models.get(task.taskId)))
})

// Load routers
app.use('/', peerServer)
app.use('/tasks', tasksRouter)
