import cors from 'cors'
import express from 'express'
import expressWS from 'express-ws'

import { CONFIG } from './config'
import { Router } from './router'
import { TasksAndModels } from './tasks'
import { tf, Task, TaskProvider } from '@epfml/discojs-node'
import * as http from 'http'

export class Disco {
  private readonly _app: express.Application
  private readonly tasksAndModels: TasksAndModels

  constructor () {
    this._app = express()
    this.tasksAndModels = new TasksAndModels()
  }

  public get server (): express.Application {
    return this._app
  }

  // Load tasks provided by default with disco server
  async addDefaultTasks (): Promise<void> {
    await this.tasksAndModels.loadDefaultTasks()
  }

  // If a model is not provided, its url must be provided in the task object
  async addTask (task: Task | TaskProvider, model?: tf.LayersModel | URL): Promise<void> {
    await this.tasksAndModels.addTaskAndModel(task, model)
  }

  serve (port?: number): http.Server {
    const wsApplier = expressWS(this.server, undefined, { leaveRouterUntouched: true })
    const app = wsApplier.app

    app.enable('trust proxy')
    app.use(cors())
    app.use(express.json({ limit: '50mb' }))
    app.use(express.urlencoded({ limit: '50mb', extended: false }))

    const baseRouter = new Router(wsApplier, this.tasksAndModels, CONFIG)
    app.use('/', baseRouter.router)

    const server = app.listen(port ?? CONFIG.serverPort, () => {
      console.log(`listening on port ${CONFIG.serverPort}`)
    })

    console.info('Disco server initially loaded these tasks:')
    console.table(
      Array.from(this.tasksAndModels.tasksAndModels).map(t => {
        return {
          'Task id': t[0].taskID,
          Title: t[0].displayInformation.taskTitle,
          'Data type': t[0].trainingInformation.dataType,
          Epochs: t[0].trainingInformation.epochs
        }
      })
    )

    return server
  }
}

export async function runDefaultServer (port?: number): Promise<http.Server> {
  const disco = new Disco()
  await disco.addDefaultTasks()
  return disco.serve(port)
}
