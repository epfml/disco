#!/usr/bin/env node

/**
 * Script used to start a Disco Server
 */

import { defaultTasks } from "@epfml/discojs";

import { Server } from "./server.js";

const PORT = 8080;

const providers = Object.values(defaultTasks);

console.info("Server loaded the tasks below");
console.table(
  providers
    .map((p) => p.getTask())
    .map((task) => ({
      ID: task.id,
      Title: task.displayInformation.taskTitle,
      "Data Type": task.trainingInformation.dataType,
      Scheme: task.trainingInformation.scheme,
    })),
);

// Init the server with default tasks
const [_, serverURL] = await new Server().serve(PORT, ...providers);
console.log(`Disco Server listening on ${serverURL.toString()}`);
