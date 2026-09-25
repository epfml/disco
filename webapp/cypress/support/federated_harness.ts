import "@tensorflow/tfjs-node";

import type * as http from "node:http";
import type * as net from "node:net";
import { createInterface } from "node:readline";

import { Disco, defaultModels, defaultTasks } from "@epfml/discojs";
import { loadCSV } from "@epfml/discojs-node";
import { Server } from "server";

const SERVER_PORT = 8080;

interface ClosableParticipant {
  close(): Promise<void>;
}

let server: http.Server | undefined;
let serverUrl: URL | undefined;
const sockets = new Set<net.Socket>();
let participant: ClosableParticipant | undefined;

async function startParticipant(datasetPath: string): Promise<void> {
  if (participant !== undefined)
    throw new Error("the federated Node participant is already running");
  if (serverUrl === undefined)
    throw new Error("the federated test server is not running");

  const task = await defaultTasks.titanic.getTask();
  const disco = new Disco(task, serverUrl, {
    preprocessOnce: true,
    debugLabel: "cypress-node-participant",
  });
  participant = disco;
  let rounds = 0;
  let epochs = 0;
  try {
    for await (const round of disco.trainByRound(loadCSV(datasetPath))) {
      rounds++;
      epochs += round.epochs.size;
    }
    console.log(
      `DISCO_E2E_PARTICIPANT_RESULT ${JSON.stringify({ rounds, epochs })}`,
    );
  } catch (error) {
    console.log(
      `DISCO_E2E_PARTICIPANT_ERROR ${error instanceof Error ? error.stack : String(error)}`,
    );
  } finally {
    await disco.close();
    if (participant === disco) participant = undefined;
  }
}

async function stopParticipant(): Promise<void> {
  const running = participant;
  participant = undefined;
  if (running !== undefined) await running.close();
}

async function stop(): Promise<void> {
  await stopParticipant().catch(() => undefined);
  const handle = server;
  server = undefined;
  serverUrl = undefined;
  if (handle !== undefined) handle.close();
  for (const socket of sockets) socket.destroy();
  sockets.clear();
}

const discoServer = await Server.with(
  [defaultModels.TitanicClassifier],
  [defaultTasks.titanic],
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
    | { readonly type: "start-participant"; readonly datasetPath: string }
    | { readonly type: "stop-participant" };
  if (command.type === "start-participant") {
    void startParticipant(command.datasetPath);
  } else {
    void stopParticipant();
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void stop().finally(() => process.exit(0));
  });
}
