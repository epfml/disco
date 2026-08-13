import cors from "cors";
import express from "express";
import expressWS from "express-ws";
import type * as http from "http";

import type {
  DataType,
  Network,
  ModelCard,
  TaskProvider,
} from "@epfml/discojs";

import { TaskRouter, TrainingRouter } from "./routes/index.js";
import { TaskSet } from "./task_set.js";
import { ModelSet } from "./model_set.js";
import { ModelRouter } from "./routes/model_router.js";

/**
 * The Disco Server, initializing an Express app
 * Its main goal is to provide the available tasks (DISCOllaboratives)
 * and tasks' base models to clients.
 *
 * More info on Express apps:
 * https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Introduction
 */
export class Server {
  readonly #modelSet;
  readonly #taskSet;

  constructor() {
    this.#modelSet = new ModelSet();
    this.#taskSet = new TaskSet(this.#modelSet);
  }

  /** setup with given initial tasks */
  static async with(
    models: ModelCard<DataType>[],
    tasks: TaskProvider<DataType, Network>[],
  ): Promise<Server> {
    const server = new Server();

    await Promise.all(models.map((m) => server.#modelSet.addModel(m)));
    await Promise.all(
      tasks.map(async (t) =>
        server.#taskSet.addTask(await t.getTask(), t.modelCard.card.id),
      ),
    );

    return server;
  }

  /**
   * start server
   *
   * @param port where to start, if not given, choose a random one
   * @returns a tuple with the server instance and the URL
   *
   **/
  async serve(port?: number): Promise<[http.Server, URL]> {
    const wsApplier = expressWS(express(), undefined, {
      leaveRouterUntouched: true,
    });
    const app = wsApplier.app;

    app.enable("trust proxy");
    app.use(cors());
    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: false }));

    const taskRouter = new TaskRouter(this.#taskSet, this.#modelSet);
    const modelRouter = new ModelRouter(this.#modelSet);
    const federatedRouter = new TrainingRouter(
      "federated",
      wsApplier,
      this.#taskSet,
    );
    const decentralizedRouter = new TrainingRouter(
      "decentralized",
      wsApplier,
      this.#taskSet,
    );

    app.get("/", (_, res, next) => {
      res.send("The DISCO Server\n");
      next();
    });
    app.use("/federated", federatedRouter.router);
    app.use("/decentralized", decentralizedRouter.router);
    app.use("/tasks", taskRouter.router);
    app.use("/models", modelRouter.router);

    const server = await new Promise<http.Server>((resolve, reject) => {
      const ret = app.listen(port);
      ret.once("error", reject);
      ret.once("listening", () => resolve(ret));
    });

    return [server, urlForServer(server)];
  }
}

function urlForServer(server: http.Server): URL {
  let host: string;
  const addr = server.address();
  if (addr === null) throw new Error("should not happen: server not started");
  if (typeof addr === "string") {
    host = addr;
  } else {
    if (addr.family === "4") {
      host = `${addr.address}:${addr.port}`;
    } else {
      let address = `[${addr.address}]`;
      // axios fails on IPv6 addresses, replacing most probable axios#5333
      if (address === "[::]") {
        address = "localhost";
      }
      host = `${address}:${addr.port}`;
    }
  }

  return new URL(`http://${host}`);
}
