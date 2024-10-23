import express from 'express'
import type expressWS from 'express-ws'
import { Set } from 'immutable'
import type { Task, EncodedModel, DataType } from '@epfml/discojs'
import { serialization } from '@epfml/discojs'

import type { TaskSet } from '../task_set.js'
import { TrainingController, FederatedController, DecentralizedController } from '../controllers/index.js'

/**
 * The TrainingRouter handles client requests related the federated
 * and decentralized training.
 * TrainingRouter is a simple wrapper around the Express router that defers
 * the actual logic to the task's Controller.
 */
export class TrainingRouter {
  readonly #expressRouter: expressWS.Router

  #tasks = Set<string>()

  constructor(private readonly trainingScheme: 'federated' | 'decentralized',
    wsApplier: expressWS.Instance, taskSet: TaskSet) {
    this.#expressRouter = express.Router()
    wsApplier.applyTo(this.#expressRouter)

    this.#expressRouter.get("/", (_, res) => {
      res.send(`Disco ${this.trainingScheme} server\n`);
    });

    /* delay listener because `this` (object) isn't fully constructed yet. 
    * The lambda function inside process.nextTick is executed after the current operation 
    * on the JS stack runs to completion and before the event loop is allowed to continue.
    * this.onNewTask is registered as a listener to taskSet, which has 2 consequences:
    * - this.onNewTask is executed on all the default tasks (which are already loaded in taskSet)
    * - Every time a new task and model are added to taskSet, this.onNewTask is executed on them.
    * For every task and model, this.onNewTask creates a path /taskID and routes it to this.handle.
    */
    process.nextTick(() => {
      taskSet.on('newTask',
        async ({ task, encodedModel }) => { await this.onNewTask(task, encodedModel) }
      )
    })
  }

  // The method called to use the TrainingRouter
  public get router (): express.Router {
    return this.#expressRouter
  }

  // Register the task and setup the controller to handle
  // websocket connections
  private async onNewTask<D extends DataType>(
    task: Task<D>,
    encodedModel: EncodedModel,
  ): Promise<void> {
    this.#tasks = this.#tasks.add(task.id)
    // The controller handles the actual logic of collaborative training
    // in its `handle` method. Each task has a dedicated controller which
    // handles the training logic of this task only
    let taskController: TrainingController<D>;
    if (this.trainingScheme == 'federated') {
      // The federated controller takes the initial model weights at initialization
      // so that it can send it to new clients
      const model = serialization.model.decode(encodedModel)
      const encodedWeights = await serialization.weights.encode((await model).weights)
      taskController = new FederatedController(task, encodedWeights)
    } else {
      // In decentralized learning, the server (i.e. controller) never handles model weights
      taskController = new DecentralizedController(task)
    } 

    // Setup a websocket route which calls the controller's `handle` method
    this.#expressRouter.ws(`/${task.id}`, (ws, req) => {
      if (this.isValidUrl(req.url)) {
        taskController.handle(ws)
      } else {
        ws.terminate()
        ws.close()
      }
    })
  }

  /**
   * We expect the url to follow the format: /task_id/.websocket
   */
  public isValidUrl (url: string | undefined): boolean {
    const splittedUrl = url?.split('/')

    return (
      splittedUrl !== undefined &&
      splittedUrl.length === 3 &&
      splittedUrl[0] === '' && // nothing before the first slash
      this.#tasks.has((splittedUrl[1])) && // is it a valid task
      splittedUrl[2] === '.websocket' // is it a websocket url
    )
  }
}
