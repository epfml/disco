import createDebug from "debug";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import express from "express";
import { Set } from "immutable";

import type { DataType, ModelCardInfo, Network, Encoded } from "@epfml/discojs";
import { Task } from "@epfml/discojs";
import {
  serializeTaskToJSON,
  deserializeTaskFromJSON,
  modelDecode,
} from "@epfml/discojs";

import type { AccessPolicy, TaskSet } from "../task_set.js";
import type { ModelSet } from "../model_set.js";
import { generateToken, hashToken } from "../access_token.js";
import { z } from "zod";

const debug = createDebug("server:router:task_router");

/** Map the errors thrown when adding a task and its model to HTTP statuses */
function statusForAddTaskError(e: unknown): number {
  if (!(e instanceof Error)) return 500;

  switch (e.message) {
    case "added task already exists":
    case "referenced model unavailable":
    case "task and model data types do not match":
    case "model already exists":
      return 409;
    case "uploaded model is invalid":
      return 400;
    default:
      return 500;
  }
}

/** Token sent as `Authorization: Bearer <token>`, if any */
function bearerToken(request: Request): string | undefined {
  // the scheme is case-insensitive (RFC 9110)
  return /^Bearer +(\S+)$/i.exec(request.get("Authorization") ?? "")?.[1];
}

export class TaskRouter {
  readonly #expressRouter: express.Router;
  readonly #taskSet: TaskSet;
  readonly #modelSet: ModelSet;

  constructor(taskSet: TaskSet, modelSet: ModelSet) {
    this.#taskSet = taskSet;
    this.#modelSet = modelSet;
    this.#expressRouter = express.Router();

    // Return public tasks upon GET requests, private ones are only given by ID
    this.#expressRouter.get("/", (_, res) => {
      res.status(200).send(
        this.#taskSet.tasks
          .filter((_, id) => this.#taskSet.canAccess(id))
          .valueSeq()
          .map(([t, _]) => serializeTaskToJSON(t))
          .toArray(),
      );
    });

    // Return the task schema to advertise available options
    this.#expressRouter.get("/schema", (_, res) => {
      res
        .status(200)
        .send(Task.schema.toJSONSchema({ unrepresentable: "any" }));
    });

    // Return a single task, which is how clients get a private one
    this.#expressRouter.get("/:id", (req, res) => {
      const id = req.params.id;
      const taskAndModel = this.#taskSet.tasks.get(id);
      if (
        taskAndModel === undefined ||
        !this.#taskSet.canAccess(id, bearerToken(req))
      ) {
        res.status(404).end();
        return;
      }
      res.status(200).send(serializeTaskToJSON(taskAndModel[0]));
    });

    this.#expressRouter.use(express.json());

    // POST request to add a new task
    this.#expressRouter.post("/", async (req, res) => {
      try {
        const parsed = await z
          .object({
            // either the ID of a model the server already has, or an encoded
            // model to upload along with the task
            model: z.union([
              z.string(),
              z.array(z.number()).transform((bytes) => Uint8Array.from(bytes)),
            ]),
            // the server generates the ID
            task: z
              .record(z.string(), z.json())
              .transform((definition) =>
                deserializeTaskFromJSON({ ...definition, id: randomUUID() }),
              ),
            private: z.boolean().default(false),
          })
          .safeParseAsync(req.body);

        if (!parsed.success) {
          debug("posted task isn't valid: %s", parsed.error);
          res.status(400).end();
          return;
        }
        const { model, task, private: isPrivate } = parsed.data;

        // the server only keeps the hash, so this is the token's only copy
        const token = isPrivate ? generateToken() : undefined;
        const policy: AccessPolicy =
          token === undefined
            ? { visibility: "public" }
            : { visibility: "private", tokenHash: hashToken(token) };

        try {
          const modelID =
            typeof model === "string"
              ? model
              : await this.registerUploadedModel(task, model);

          this.#taskSet.addTask(task, modelID, policy);
        } catch (e) {
          debug("add task failed with: %o", e);
          res.status(statusForAddTaskError(e)).end();
          return;
        }

        if (token === undefined) res.status(200).json({ id: task.id });
        // prevent caching the token
        else
          res
            .set("Cache-Control", "no-store")
            .status(200)
            .json({ id: task.id, token });
      } catch (_) {
        res.status(400).end();
      }
    });

    this.#taskSet.on("newTask", ([task]) => {
      this.#expressRouter.get(`/${task.id}/:file`, (req, res) =>
        this.getLatestModel(task.id, req, res),
      );
    });
  }

  public get router(): express.Router {
    return this.#expressRouter;
  }

  /**
   * Register a model uploaded along with a task, returning its new ID.
   *
   * An upload is anonymous bytes, so we derive its card from the task it came
   * with. Its data type is read from the model itself rather than taken from
   * the request, so it cannot disagree with what the model actually is.
   *
   * The model is stored still encoded, as that is what gets sent to clients.
   */
  private async registerUploadedModel(
    task: Task<DataType, Network>,
    encoded: Encoded,
  ): Promise<ModelCardInfo.ID> {
    let uploaded;
    try {
      uploaded = await modelDecode(encoded);
    } catch (e) {
      debug("posted model isn't a valid encoded model: %o", e);
      throw new Error("uploaded model is invalid");
    }

    if (uploaded.datatype !== task.dataType)
      throw new Error("task and model data types do not match");

    const info: ModelCardInfo<DataType> = {
      id: `${task.id}-model`,
      name: task.displayInformation.title,
      dataType: uploaded.datatype,
    };

    await this.#modelSet.addModel([info, encoded]);

    return info.id;
  }

  /**
   * Request handler called when a client sends a GET request asking for the
   * TFJS model files of a given task. The files consist of the model's
   * architecture file model.json and its layer weights file weights.bin.
   * It requires no prior connection to the server: public tasks' models are
   * available to anyone, private ones only with the task's token.
   * @param request received from client
   * @param response sent to client
   */
  private getLatestModel(
    id: Task.ID,
    request: Request<{ file: string }>,
    response: Response,
  ): void {
    const validModelFiles = Set.of("model.json", "weights.bin");

    const file = request.params.file;
    if (!validModelFiles.has(file)) {
      response.status(404).end();
      return;
    }
    const taskAndModel = this.#taskSet.tasks.get(id);
    if (
      taskAndModel === undefined ||
      !this.#taskSet.canAccess(id, bearerToken(request))
    ) {
      response.status(404).end();
      return;
    }
    response.status(200).send(Buffer.from(taskAndModel[1]));
    debug(`${file} download for task ${id} succeeded`);
  }
}
