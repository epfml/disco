// Serves the MNIST task for decentralized Cypress tests.
// Started alongside Vite by the test runner, which kills it once Cypress is done.

import "@tensorflow/tfjs-node";

import { defaultModels, defaultTasks } from "@epfml/discojs";
import { Server } from "server";

try {
  const server = await Server.with(
    [defaultModels.MNISTClassifier],
    [defaultTasks.mnist],
  );
  await server.serve(8080);
} catch (error) {
  console.error("decentralized server failed", error);
  process.exit(1);
}
