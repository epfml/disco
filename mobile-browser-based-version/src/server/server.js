const express               = require('express')
const fs                    = require('fs')
const { ExpressPeerServer } = require('peer')
const { make_id }           = require('./helpers.js')
const { models }            = require('./models.js')


const app = express()
const server = app.listen(3000)

// Set up peer server
const peer_server = ExpressPeerServer(server, {
    path: '/peers',
    key: 'api',
    allow_discovery: true,
    generateClientId: make_id
})

// Load task descriptions
const TASKS_PATH = 'src/server/tasks.json'
const tasks = JSON.parse(fs.readFileSync(TASKS_PATH))

// Set up tasks router
const tasks_router = express.Router()
tasks_router.get('/', (req, res) => res.send(tasks))
tasks.forEach(task => {
    tasks_router.get('/' + task.task_id, (req, res) => res.send(models.get(task.task_id)))
})

// Load routers
app.use('/', peer_server)
app.use('/tasks', tasks_router)
