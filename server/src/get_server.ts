import cors from 'cors'
import express from 'express'
import expressWS from 'express-ws'
import { RequestContext } from '@mikro-orm/core'

import { initORM, orm } from './database.js'
import { CONFIG } from './config.js'
import { Router } from './router/index.js'
import { type tf, type Task, type TaskProvider } from '@epfml/discojs-node'
import { TasksAndModels } from './tasks.js'
import type * as http from 'http'

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

  async serve (port?: number): Promise<http.Server> {
    const wsApplier = expressWS(this.server, undefined, { leaveRouterUntouched: true })
    const app = wsApplier.app

    app.enable('trust proxy')
    app.use(cors())
    app.use(express.json({ limit: '50mb' }))
    app.use(express.urlencoded({ limit: '50mb', extended: false }))

    if (CONFIG.useDatabase) {
      await initORM()
      // Fork entity manager for each request (avoids identity map collisions)
      app.use((req, res, next) => {
        RequestContext.create(orm.em, next)
      })
    }

    const baseRouter = new Router(wsApplier, this.tasksAndModels, CONFIG)
    app.use('/', baseRouter.router)

    const server = app.listen(port ?? CONFIG.serverPort, () => {
      console.log(`Disco Server listening on ${CONFIG.serverUrl.href}`)
    })

    console.info('Disco Server initially loaded the tasks below\n')
    console.table(
      Array.from(this.tasksAndModels.tasksAndModels).map(t => {
        return {
          ID: t[0].taskID,
          Title: t[0].displayInformation.taskTitle,
          'Data Type': t[0].trainingInformation.dataType,
          Scheme: t[0].trainingInformation.scheme
        }
      })
    )

    return server
  }
}

export async function runDefaultServer (port?: number): Promise<http.Server> {
  const disco = new Disco()
  await disco.addDefaultTasks()
  return await disco.serve(port)
}
