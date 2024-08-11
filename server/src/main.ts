#!/usr/bin/env node

import { defaultTasks } from "@epfml/discojs";

import { Server } from "./server.js";

const PORT = 8080;

const providers = Object.values(defaultTasks);

const server = await Server.of(...providers);

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

await server.serve(PORT);
console.log(`Disco Server listening on http://localhost:${PORT}`);
