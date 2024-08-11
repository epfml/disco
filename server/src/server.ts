import cors from "cors";
import express from "express";
import expressWS from "express-ws";
import type * as http from "http";

import type { TaskProvider } from "@epfml/discojs";

import { Router } from "./router/index.js";
import { TasksAndModels } from "./tasks.js";

export class Server {
  readonly #tasksAndModels = new TasksAndModels();

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

    const baseRouter = new Router(wsApplier, this.#tasksAndModels);
    app.use("/", baseRouter.router);

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
