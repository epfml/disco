import "@tensorflow/tfjs-node";

import type * as http from "node:http";
import type * as net from "node:net";
import { createInterface } from "node:readline";

import { Disco, defaultModels, defaultTasks } from "@epfml/discojs";
import { loadImagesInDir } from "@epfml/discojs-node";
import { Repeat } from "immutable";
import { Server } from "server";

const SERVER_PORT = 8081;

interface ClosablePeer {
  close?: () => Promise<void>;
  disconnect?: () => Promise<void>;
}

let server: http.Server | undefined;
let serverUrl: URL | undefined;
const sockets = new Set<net.Socket>();
let activePeers: ClosablePeer[] = [];

async function startTraining(datasetPath: string): Promise<void> {
  if (activePeers.length > 0)
    throw new Error("a decentralized harness run is already active");
  if (serverUrl === undefined)
    throw new Error("the decentralized test server is not running");

  const task = await defaultTasks.mnist.getTask();
  const clients = [0, 1].map(
    (index) =>
      new Disco(task, serverUrl!, {
        preprocessOnce: true,
        debugLabel: `cypress-node-participant-${index + 1}`,
      }),
  );
  activePeers = clients;
  try {
    const results = await Promise.all(
      clients.map(async (client) => {
        const dataset = (await loadImagesInDir(datasetPath)).zip(Repeat("0"));
        let rounds = 0;
        let epochs = 0;
        for await (const round of client.trainByRound(dataset)) {
          rounds++;
          epochs += round.epochs.size;
        }
        return { rounds, epochs };
      }),
    );
    console.log(`DISCO_E2E_TRAINING_RESULT ${JSON.stringify(results)}`);
  } finally {
    await stopRun();
  }
}

async function closePeer(peer: ClosablePeer): Promise<void> {
  if (peer.close !== undefined) await peer.close();
  else if (peer.disconnect !== undefined) await peer.disconnect();
}

async function stopRun(): Promise<void> {
  const peers = activePeers;
  activePeers = [];
  await Promise.allSettled(peers.map(closePeer));
}

async function stop(): Promise<void> {
  await stopRun();
  const handle = server;
  server = undefined;
  serverUrl = undefined;
  if (handle !== undefined) handle.close();
  for (const socket of sockets) socket.destroy();
  sockets.clear();
}

const discoServer = await Server.with(
  [defaultModels.MNISTClassifier],
  [defaultTasks.mnist],
);
[server, serverUrl] = await discoServer.serve(SERVER_PORT);
server.on("connection", (socket) => {
  sockets.add(socket);
  socket.once("close", () => sockets.delete(socket));
});
console.log("DISCO_E2E_SERVER_READY");

const lines = createInterface({ input: process.stdin });
lines.on("line", (line) => {
  const command = JSON.parse(line) as
    | { readonly type: "start-training"; readonly datasetPath: string }
    | { readonly type: "stop-run" };

  let run: Promise<void>;
  if (command.type === "start-training")
    run = startTraining(command.datasetPath);
  else run = stopRun();

  void run.catch((error: unknown) => {
    console.log(
      `DISCO_E2E_RUN_ERROR ${error instanceof Error ? error.stack : String(error)}`,
    );
  });
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void stop().finally(() => process.exit(0));
  });
}
