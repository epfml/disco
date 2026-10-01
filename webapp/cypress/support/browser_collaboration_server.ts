import "@tensorflow/tfjs-node";

import { defaultModels, defaultTasks } from "@epfml/discojs";
import { Server } from "server";

const server = await Server.with(
  [defaultModels.MNISTClassifier],
  [defaultTasks.mnist],
);
await server.serve(8082);
