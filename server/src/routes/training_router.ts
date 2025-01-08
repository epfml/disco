import express from 'express'
import type expressWS from 'express-ws'
import type { Task, DataType } from '@epfml/discojs'
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

  constructor(private readonly trainingScheme: 'federated' | 'decentralized',
    wsApplier: expressWS.Instance, taskSet: TaskSet) {
    this.#expressRouter = express.Router()
    wsApplier.applyTo(this.#expressRouter)

    this.#expressRouter.get("/", (_, res) => {
      res.send(`Disco ${this.trainingScheme} server\n`);
    });

    taskSet.on(
      "newTask",
      async ([task, encodedModel]) => await this.onNewTask(task, encodedModel),
    );
  }

  // The method called to use the TrainingRouter
  public get router (): express.Router {
    return this.#expressRouter
  }

  // Register the task and setup the controller to handle
  // websocket connections
  private async onNewTask<D extends DataType>(
    task: Task<D>,
    encodedModel: serialization.Encoded,
  ): Promise<void> {
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

    this.#expressRouter.ws(`/${task.id}`, (ws) => taskController.handle(ws));
  }
}
