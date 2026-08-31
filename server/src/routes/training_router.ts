import express from "express";
import type expressWS from "express-ws";
import createDebug from "debug";
import type { Task, DataType, Network } from "@epfml/discojs";
import { serialization } from "@epfml/discojs";

import type { TaskSet } from "../task_set.js";
import {
  TrainingController,
  FederatedController,
  DecentralizedController,
} from "../controllers/index.js";

const debug = createDebug("server:routes:training");

/**
 * The TrainingRouter handles client requests related the federated
 * and decentralized training.
 * TrainingRouter is a simple wrapper around the Express router that defers
 * the actual logic to the task's Controller.
 */
export class TrainingRouter<N extends Exclude<Network, "local">> {
  readonly #expressRouter: expressWS.Router;

  constructor(network: N, wsApplier: expressWS.Instance, taskSet: TaskSet) {
    this.#expressRouter = express.Router();
    wsApplier.applyTo(this.#expressRouter);

    this.#expressRouter.get("/", (_, res) => {
      res.send(`Disco ${network} server\n`);
    });

    taskSet.on("newTask", async ([task, encodedModel]) => {
      if (task.trainingInformation.scheme !== network) return;
      const t = task as Task<DataType, N>;

      await this.onNewTask(t, encodedModel);
    });
  }

  // The method called to use the TrainingRouter
  public get router(): express.Router {
    return this.#expressRouter;
  }

  // Register the task and setup the controller to handle
  // websocket connections
  private async onNewTask<D extends DataType>(
    task: Task<D, N>,
    encodedModel: serialization.Encoded,
  ): Promise<void> {
    // The controller handles the actual logic of collaborative training
    // in its `handle` method. Each task has a dedicated controller which
    // handles the training logic of this task only
    let taskController: TrainingController<D, "federated" | "decentralized">;
    if (task.trainingInformation.scheme === "federated") {
      const t = task as Task<D, "federated">;

      // The federated controller takes the initial model weights at initialization
      // so that it can send it to new clients
      const model = await serialization.model.decode(encodedModel);
      const weights = model.weights;
      let encodedWeights: serialization.Encoded;
      try {
        encodedWeights = await serialization.weights.encode(weights);
      } catch (err) {
        debug("Failed to encode initial weights for task %s: %o", task.id, err);
        throw err;
      } finally {
        model[Symbol.dispose]();
      }
      taskController = new FederatedController(t, encodedWeights);
    } else {
      const t = task as Task<D, "decentralized">;

      // In decentralized learning, the server (i.e. controller) never handles model weights
      taskController = new DecentralizedController(t);
    }

    this.#expressRouter.ws(`/${task.id}`, (ws) => taskController.handle(ws));
  }
}
