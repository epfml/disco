// Serves the Titanic task and trains on it as a Node participant so that the
// browser driven by cypress/collaborative/federated.cy.ts has a federated peer.
// Started next to vite by the test runner, which kills it once Cypress is done.

import "@tensorflow/tfjs-node";

import path from "node:path";

import { Disco, defaultModels, defaultTasks } from "@epfml/discojs";
import { loadCSV } from "@epfml/discojs-node";
import { Server } from "server";

const server = await Server.with(
  [defaultModels.TitanicClassifier],
  [defaultTasks.titanic],
);
const [, url] = await server.serve(8080);

// Waits on the server for the browser to join, as the task requires two
// participants to aggregate.
const disco = new Disco(await defaultTasks.titanic.getTask(), url, {
  preprocessOnce: true,
  debugLabel: "cypress-node-peer",
});
const dataset = loadCSV(
  path.join(import.meta.dirname, "../../../datasets/titanic_train.csv"),
);

try {
  let rounds = 0;
  for await (const _ of disco.trainByRound(dataset)) rounds++;
  console.log(`federated peer finished training after ${rounds} rounds`);
} catch (error) {
  // Take the server down so that the browser fails instead of waiting forever.
  console.error("federated peer failed", error);
  process.exit(1);
} finally {
  await disco.close();
}
