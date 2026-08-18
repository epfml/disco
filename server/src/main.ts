#!/usr/bin/env node

/**
 * Script used to start a Disco Server
 */

import type { DataType, Network, Task } from "@epfml/discojs";
import { defaultTasks, defaultModels } from "@epfml/discojs";

import { Server } from "./server.js";

const PORT = 8080;

const models = Object.values(defaultModels);
const taskProviders = Object.values(defaultTasks);

console.info("Server loaded the tasks below");
console.table(
  (await Promise.all(taskProviders.map((p) => p.getTask()))).map(
    (task: Task<DataType, Network>) => ({
      ID: task.id,
      Title: task.displayInformation.title,
      "Data Type": task.dataType,
      Scheme: task.trainingInformation.scheme,
    }),
  ),
);
console.table(
  models.map((m) => ({
    ID: m.card.id,
    Title: m.card.name,
    "Data Type": m.card.dataType,
  })),
);

// Init the server with default tasks
const server = await Server.with(models, taskProviders);
const [_, serverURL] = await server.serve(PORT);
console.log(`Disco Server listening on ${serverURL.toString()}`);
