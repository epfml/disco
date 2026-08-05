import tf from "@tensorflow/tfjs-node";

import type { TaskProvider, ModelCard } from "@epfml/discojs";
import { defaultTasks, models } from "@epfml/discojs";
import { Server as DiscoServer } from "server";

// Define your own model card
const customModelCard: ModelCard<"tabular"> = {
  card: {
    id: "custom_model_id",
    name: "Custom name",
    preTrained: false,
  },

  async getModel() {
    const model = tf.sequential();

    model.add(
      tf.layers.dense({
        inputShape: [1],
        units: 124,
        activation: "relu",
        kernelInitializer: "leCunNormal",
      }),
    );
    model.add(tf.layers.dense({ units: 32, activation: "relu" }));
    model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

    model.compile({
      optimizer: "rmsprop",
      loss: "binaryCrossentropy",
      metrics: ["accuracy"],
    });

    return Promise.resolve(new models.TFJS("tabular", model));
  },
};

// Define your own task provider (task definition + model)
const customTask: TaskProvider<"tabular", "federated"> = {
  getTask() {
    return Promise.resolve({
      id: "custom-task",
      dataType: "tabular",
      displayInformation: {
        title: "Custom task",
        summary: {
          preview: "task preview",
          overview: "task overview",
        },
      },
      trainingInformation: {
        epochs: 5,
        roundDuration: 10,
        validationSplit: 0,
        batchSize: 30,
        inputColumns: ["Age"],
        outputColumn: "Output",
        scheme: "federated",
        aggregationStrategy: "mean",
        minNbOfParticipants: 2,
        tensorBackend: "tfjs",
        privacy: undefined,
      },
    });
  },

  getModel() {
    const model = tf.sequential();

    model.add(
      tf.layers.dense({
        inputShape: [1],
        units: 124,
        activation: "relu",
        kernelInitializer: "leCunNormal",
      }),
    );
    model.add(tf.layers.dense({ units: 32, activation: "relu" }));
    model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

    model.compile({
      optimizer: "rmsprop",
      loss: "binaryCrossentropy",
      metrics: ["accuracy"],
    });

    return Promise.resolve(new models.TFJS("tabular", model));
  },

  modelCard: customModelCard,
};

async function runServer(): Promise<void> {
  // Create a server
  const server = await DiscoServer.with(
    defaultTasks.titanic, // with some tasks provided by Disco
    customTask, // or your own custom task
  );

  // Start the server
  await server.serve(8080);
}

runServer().catch(console.error);
