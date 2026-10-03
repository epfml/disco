// Serves the selected task and trains on it as a Node participant so that the
// browser driven by cypress/e2e/training/federated has a federated peer.
// Started next to vite by the test runner, which kills it once Cypress is done.

import "@tensorflow/tfjs-node";

import * as fs from "node:fs/promises";
import path from "node:path";

import { Dataset, Disco, defaultModels, defaultTasks } from "@epfml/discojs";
import { loadCSV, loadImage } from "@epfml/discojs-node";
import { Repeat } from "immutable";
import { Server } from "server";

const taskName = process.env.DISCO_E2E_FEDERATED_TASK ?? "titanic";
if (taskName !== "titanic" && taskName !== "lus_covid") {
  throw new Error(`Unknown federated E2E task: ${taskName}`);
}

const lusCovidTask = {
  ...defaultTasks.lusCovid,
  async getTask() {
    const task = await defaultTasks.lusCovid.getTask();
    return {
      ...task,
      trainingInformation: {
        ...task.trainingInformation,
        epochs: 4,
        roundDuration: 4,
      },
    };
  },
};

const server = await Server.with(
  taskName === "titanic"
    ? [defaultModels.TitanicClassifier]
    : [defaultModels.LUSClassifier],
  taskName === "titanic" ? [defaultTasks.titanic] : [lusCovidTask],
);
const [, url] = await server.serve(8080);

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
    const disco = new Disco(await defaultTasks.titanic.getTask(), url, {
      preprocessOnce: true,
      debugLabel: "cypress-node-peer",
    });
    try {
      const dataset = loadCSV(
        path.join(import.meta.dirname, "../../../datasets/titanic_train.csv"),
      );
      let rounds = 0;
      for await (const _ of disco.trainByRound(dataset)) rounds++;
      console.log(`federated Titanic peer finished after ${rounds} rounds`);
    } finally {
      await disco.close().catch((error: unknown) => {
        console.warn("could not close Titanic peer", error);
      });
    }
  } else {
    const disco = new Disco(await lusCovidTask.getTask(), url, {
      preprocessOnce: true,
      debugLabel: "cypress-node-peer",
    });
    try {
      const folder = path.join(
        import.meta.dirname,
        "../../../datasets/lus_covid",
      );
      const positive = (
        await nodeHalfOfImages(path.join(folder, "COVID+"))
      ).zip(Repeat("COVID-Positive"));
      const negative = (
        await nodeHalfOfImages(path.join(folder, "COVID-"))
      ).zip(Repeat("COVID-Negative"));
      let rounds = 0;
      for await (const _ of disco.trainByRound(positive.chain(negative)))
        rounds++;
      console.log(`federated LUS COVID peer finished after ${rounds} rounds`);
    } finally {
      await disco.close().catch((error: unknown) => {
        console.warn("could not close LUS COVID peer", error);
      });
    }
  }
} catch (error) {
  // Take the server down so that the browser fails instead of waiting forever.
  console.error("federated peer failed", error);
  process.exit(1);
}
