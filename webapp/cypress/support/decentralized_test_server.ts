// Serve the MNIST task for collaborative Cypress tests. The Node peers are
// optional: the browser-to-browser test starts this process without them.
import "@tensorflow/tfjs-node";

import path from "node:path";

import { Disco, defaultModels, defaultTasks } from "@epfml/discojs";
import { loadImagesInDir } from "@epfml/discojs-node";
import { Repeat } from "immutable";
import { Server } from "server";

const server = await Server.with(
  [defaultModels.MNISTClassifier],
  [defaultTasks.mnist],
);
const [, serverUrl] = await server.serve(8081);

if (process.argv.includes("--with-node-peers")) {
  const task = await defaultTasks.mnist.getTask();
  const datasetPath = path.resolve(
    import.meta.dirname,
    "../../../datasets/CIFAR10",
  );
  const results = await Promise.all(
    [0, 1].map(async (index) => {
      const disco = new Disco(task, serverUrl, {
        preprocessOnce: true,
        debugLabel: `cypress-node-participant-${index + 1}`,
      });
      try {
        const dataset = (await loadImagesInDir(datasetPath)).zip(Repeat("0"));
        let rounds = 0;
        let epochs = 0;
        for await (const round of disco.trainByRound(dataset)) {
          rounds++;
          epochs += round.epochs.size;
        }
        return { rounds, epochs };
      } finally {
        await disco.close();
      }
    }),
  );
  console.log(
    `decentralized peers finished training: ${JSON.stringify(results)}`,
  );
}
