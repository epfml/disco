import createDebug from "debug";
import type { Request, Response } from 'express'
import express from 'express'
import { Set } from 'immutable'

import type { Task } from "@epfml/discojs";
import { serialization } from "@epfml/discojs";

import type { TaskSet } from '../task_set.js'
import { z } from "zod";

const debug = createDebug("server:router:task_router");

export class TaskRouter {
  readonly #expressRouter: express.Router
  readonly #taskSet: TaskSet

  constructor(taskSet: TaskSet) {
    this.#taskSet = taskSet
    this.#expressRouter = express.Router()

    // Return available tasks upon GET requests
    this.#expressRouter.get('/', (_, res) => {
      res
        .status(200)
        .send(
          this.#taskSet.tasks
            .map(([t, _]) => [...serialization.task.encode(t)])
            .toArray(),
        );
    })

		this.#expressRouter.use(express.json());

		// POST request to add a new task
		this.#expressRouter.post("/", async (req, res) => {
			const parsed = await z
				.object({
					model: z
						.array(z.number())
						.transform((arr) => Uint8Array.from(arr))
						.transform(serialization.model.decode),
					task: z
						.array(z.number())
						.transform((arr) => Uint8Array.from(arr))
						.transform(serialization.task.decode),
				})
				.safeParseAsync(req.body);

			if (!parsed.success) {
				debug("posted task isn't valid: %s", parsed.error);
				res.status(400).end();
				return;
			}
			const { model, task } = parsed.data;

			try {
				await this.#taskSet.addTask(task, model);
			} catch (e) {
				debug("add task failed with: %o", e);
				res.status(500).end();
			}

			res.status(200).end("Successful task upload");
		});

    this.#taskSet.on("newTask", ([task]) => {
      this.#expressRouter.get(`/${task.id}/:file`, (req, res) =>
        this.getLatestModel(task.id, req, res)
      );
    });
  }

  public get router (): express.Router {
    return this.#expressRouter
  }

  /**
   * Request handler called when a client sends a GET request asking for the
   * TFJS model files of a given task. The files consist of the model's
   * architecture file model.json and its layer weights file weights.bin.
   * It requires no prior connection to the server and is thus publicly available
   * data.
   * @param request received from client
   * @param response sent to client
   */
  private getLatestModel (id: Task.ID, request: Request, response: Response): void {
    const validModelFiles = Set.of('model.json', 'weights.bin')

    const file = request.params.file
    if (!validModelFiles.has(file)) {
      response.status(404)
      return
    }
    const taskAndModel = this.#taskSet.tasks.find(([t, _]) => t.id === id)
    if (taskAndModel === undefined) {
      response.status(404)
      return
    }
    response.status(200).send(Buffer.from(taskAndModel[1]))
    debug(`${file} download for task ${id} succeeded`)
  }
}
