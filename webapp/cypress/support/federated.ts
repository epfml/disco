// Serves the selected task and trains on it as a Node participant so that the
// browser driven by cypress/e2e/training/federated has a federated peer.
// Started next to vite by the test runner, which kills it once Cypress is done.

import "@tensorflow/tfjs-node";

import * as fs from "node:fs/promises";
import path from "node:path";

import { Dataset, Disco, defaultTasks } from "@epfml/discojs";
import type { DataFormat, DataType, TaskProvider } from "@epfml/discojs";
import { loadCSV, loadImage } from "@epfml/discojs-node";
import { Repeat } from "immutable";
import { Server } from "server";
import { withTrainingConfig } from "./training.ts";

const taskName = process.env.DISCO_E2E_FEDERATED_TASK ?? "titanic";
if (taskName !== "titanic" && taskName !== "lus_covid") {
  throw new Error(`Unknown federated E2E task: ${taskName}`);
}

// For LUS we don't run on all epochs because it's too heavy for CI.
const reducedLusCovidTask = withTrainingConfig(defaultTasks.lusCovid, {
  epochs: 4,
  roundDuration: 4,
});

async function train<D extends DataType>(
  provider: TaskProvider<D, "federated">,
  dataset: Dataset<DataFormat.Raw[D]>,
): Promise<void> {
  const server = await Server.with([provider.modelCard], [provider]);
  const [, url] = await server.serve(8080);
  const task = await provider.getTask();
  const disco = new Disco(task, url, {
    preprocessOnce: true,
    debugLabel: "cypress-node-peer",
  });
  try {
    let rounds = 0;
    for await (const _ of disco.trainByRound(dataset)) rounds++;
    console.log(`federated ${task.id} peer finished after ${rounds} rounds`);
  } finally {
    await disco.close().catch((error: unknown) => {
      console.warn(`could not close ${task.id} peer`, error);
    });
  }
}

async function nodeHalfOfImages(directory: string) {
  const filenames = (await fs.readdir(directory))
    .filter((filename) => /\.(png|jpe?g)$/i.test(filename))
    .sort()
    .filter((_, index) => index % 2 === 1);
  if (filenames.length === 0) throw new Error(`No images in ${directory}`);
  return new Dataset(
    filenames.map((filename) => path.join(directory, filename)),
  ).map(loadImage);
}

try {
  if (taskName === "titanic") {
    await train(
      defaultTasks.titanic,
      loadCSV(
        path.join(import.meta.dirname, "../../../datasets/titanic_train.csv"),
      ),
    );
  } else {
    const folder = path.join(
      import.meta.dirname,
      "../../../datasets/lus_covid",
    );
    const positive = (await nodeHalfOfImages(path.join(folder, "COVID+"))).zip(
      Repeat("COVID-Positive"),
    );
    const negative = (await nodeHalfOfImages(path.join(folder, "COVID-"))).zip(
      Repeat("COVID-Negative"),
    );
    await train(reducedLusCovidTask, positive.chain(negative));
  }
} catch (error) {
  // Take the server down so that the browser fails instead of waiting forever.
  console.error("federated peer failed", error);
  process.exit(1);
}
