import createDebug from "debug";
import cors from "cors";
import express from "express";
import expressWS from "express-ws";
import type * as http from "http";

import type { TaskProvider } from "@epfml/discojs";

import { TaskRouter, FederatedRouter, DecentralizedRouter } from './routes/index.js'
import { TasksAndModels } from "./tasks.js";

const debug = createDebug("server");

/**
 * The Disco Server, a wrapper of the Express app
 * Its main goal is to provide the available tasks (DISCOllaboratives)
 * and tasks' base models to clients. 
 * New tasks can be added via the `addTask` method.
 * Most of the logic is deferred to the Router abstraction. 
 */
export class Server {
  readonly #tasksAndModels = new TasksAndModels();

  // Static method to asynchronously init the Server
  static async of(...tasks: TaskProvider[]): Promise<Server> {
    const ret = new Server();
    await Promise.all(tasks.map((t) => ret.addTask(t)));
    return ret;
  }

  async addTask(taskProvider: TaskProvider): Promise<void> {
    await this.#tasksAndModels.addTaskAndModel(taskProvider);
  }

  /**
   * start server
   *
   * @param port where to start, if not given, choose a random one
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

    const taskRouter = new TaskRouter(this.#tasksAndModels)
    const federatedRouter = new FederatedRouter(wsApplier, this.#tasksAndModels)
    const decentralizedRouter = new DecentralizedRouter(wsApplier, this.#tasksAndModels)

    process.nextTick(() =>
      wsApplier.getWss().on('connection', (ws, req) => {
        if (!federatedRouter.isValidUrl(req.url) && !decentralizedRouter.isValidUrl(req.url)) {
          debug("connection refused on %s", req.url);
          ws.terminate()
          ws.close()
        }
      })
    )

    app.get('/', (_, res, next) => {
      res.send('The DISCO Server\n')
      next()
    })
    app.use('/feai', federatedRouter.router)
    app.use('/deai', decentralizedRouter.router)
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
