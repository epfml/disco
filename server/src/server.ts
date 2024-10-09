import createDebug from "debug";
import cors from "cors";
import express from "express";
import expressWS from "express-ws";
import type * as http from "http";

import type { TaskProvider } from "@epfml/discojs";

import { TaskRouter, TrainingRouter } from './routes/index.js'
import { TaskSet } from "./task_set.js";

const debug = createDebug("server");

/**
 * The Disco Server, initializing an Express app
 * Its main goal is to provide the available tasks (DISCOllaboratives)
 * and tasks' base models to clients. 
 * New tasks can be added via the `addTask` method.
 * 
 * More info on Express apps:
 * https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Introduction
 */
export class Server {
  readonly #taskSet = new TaskSet();

  async addTask(taskProvider: TaskProvider): Promise<void> {
    await this.#taskSet.addTask(taskProvider);
  }

  /**
   * start server
   *
   * @param port where to start, if not given, choose a random one
   * @param tasks list of initial tasks to serve
   * @returns a tuple with the server instance and the URL
   * 
   **/
  async serve(port?: number, ...tasks: TaskProvider[]): Promise<[http.Server, URL]> {
    const wsApplier = expressWS(express(), undefined, {
      leaveRouterUntouched: true,
    });
    const app = wsApplier.app;

    app.enable("trust proxy");
    app.use(cors());
    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: false }));

    const taskRouter = new TaskRouter(this.#taskSet)
    const federatedRouter = new TrainingRouter('federated', wsApplier, this.#taskSet)
    const decentralizedRouter = new TrainingRouter('decentralized', wsApplier, this.#taskSet)
    // Add tasks to the server
    await Promise.all(tasks.map((t) => this.addTask(t)));

    wsApplier.getWss().on('connection', (ws, req) => {
      if (!federatedRouter.isValidUrl(req.url) && !decentralizedRouter.isValidUrl(req.url)) {
        debug("connection refused on %s", req.url);
        ws.terminate()
        ws.close()
      }
    })

    app.get('/', (_, res, next) => {
      res.send('The DISCO Server\n')
      next()
    })
    app.use('/federated', federatedRouter.router)
    app.use('/decentralized', decentralizedRouter.router)
    app.use('/tasks', taskRouter.router)

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
