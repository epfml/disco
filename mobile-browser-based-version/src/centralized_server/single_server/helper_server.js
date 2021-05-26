const fs = require('fs')
const express = require('express')
const { ExpressPeerServer } = require('peer')

function makeid() {
    let result = ''
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let charactersLength = characters.length
    for (let i = 0; i < 12; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}

// TODO
const models = new Map([
  ['titanic', 'some_complex_value0'], ['mnist', 'some_complex_value1']
])


const app = express()
const server = app.listen(3000)

const tasks_router = express.Router()
const peer_server = ExpressPeerServer(server, {
    path: '/peers',
    key: 'api',
    allow_discovery: true,
    generateClientId: makeid
});

const TASKS_PATH = 'src/centralized_server/single_server/tasks.json'
const tasks = JSON.parse(fs.readFileSync(TASKS_PATH))

tasks_router.get('/', (req, res) => res.send(tasks))
tasks.forEach(task => {
    tasks_router.get('/' + task.task_id, (req, res) => res.send(models.get(task.task_id)))
})

app.use('/', peer_server)
app.use('/tasks', tasks_router)
