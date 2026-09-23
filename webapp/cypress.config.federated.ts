import "@tensorflow/tfjs-node";

import type * as http from "node:http";
import path from "node:path";

import { Disco, defaultModels, defaultTasks } from "@epfml/discojs";
import { loadCSV } from "@epfml/discojs-node";
import { defineConfig } from "cypress";
import { Server } from "server";

const SERVER_PORT = 8080;
const PARTICIPANT_TIMEOUT_MS = 4 * 60_000;

interface ParticipantResult {
  readonly rounds: number;
  readonly epochs: number;
}

interface ParticipantRun {
  readonly result: Promise<ParticipantResult>;
  readonly cancelTimeout: () => void;
  readonly close: () => Promise<void>;
}

let serverHandle: http.Server | undefined;
let serverUrl: URL | undefined;
let participant: ParticipantRun | undefined;

async function startServer(): Promise<void> {
  if (serverHandle !== undefined) return;

  const server = await Server.with(
    [defaultModels.TitanicClassifier],
    [defaultTasks.titanic],
  );
  [serverHandle, serverUrl] = await server.serve(SERVER_PORT);
}

async function startParticipant(projectRoot: string): Promise<null> {
  if (participant !== undefined)
    throw new Error("the federated Node participant is already running");
  if (serverUrl === undefined)
    throw new Error("the federated test server is not running");

  const task = await defaultTasks.titanic.getTask();
  const disco = new Disco(task, serverUrl, {
    preprocessOnce: true,
    debugLabel: "cypress-node-participant",
  });
  const dataset = loadCSV(
    path.resolve(projectRoot, "../datasets/titanic_train.csv"),
  );
  let closePromise: Promise<void> | undefined;
  const close = () => (closePromise ??= disco.close());

  const training = (async (): Promise<ParticipantResult> => {
    let rounds = 0;
    let epochs = 0;
    try {
      for await (const round of disco.trainByRound(dataset)) {
        rounds++;
        epochs += round.epochs.size;
      }
      return { rounds, epochs };
    } finally {
      await close();
    }
  })();

  let timeout: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      void close().catch(() => undefined);
      reject(
        new Error(
          `the federated Node participant did not finish within ${PARTICIPANT_TIMEOUT_MS / 1000}s`,
        ),
      );
    }, PARTICIPANT_TIMEOUT_MS);
  });
  const cancelTimeout = () => {
    if (timeout !== undefined) clearTimeout(timeout);
    timeout = undefined;
  };
  const result = Promise.race([training, deadline]).finally(cancelTimeout);
  // The Cypress browser continues after this task returns. Attach a handler now
  // so an early participant failure cannot become an unhandled rejection; the
  // await task below still receives and reports the original rejection.
  void result.catch(() => undefined);
  participant = { result, cancelTimeout, close };

  return null;
}

async function awaitParticipant(): Promise<ParticipantResult> {
  if (participant === undefined)
    throw new Error("the federated Node participant was not started");
  return await participant.result;
}

async function stopParticipant(): Promise<void> {
  const running = participant;
  participant = undefined;
  if (running === undefined) return;

  running.cancelTimeout();
  const closing = running.close();
  void closing.catch(() => undefined);
  await settleWithin(Promise.all([closing, running.result]), 5_000);
}

async function settleWithin(
  promise: Promise<unknown>,
  timeoutMs: number,
): Promise<void> {
  let timeout: NodeJS.Timeout | undefined;
  await Promise.race([
    promise.catch(() => undefined),
    new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, timeoutMs);
    }),
  ]);
  if (timeout !== undefined) clearTimeout(timeout);
}

async function stopServer(): Promise<void> {
  await stopParticipant();

  const handle = serverHandle;
  serverHandle = undefined;
  serverUrl = undefined;
  if (handle === undefined) return;

  await new Promise<void>((resolve, reject) =>
    handle.close((error) => (error === undefined ? resolve() : reject(error))),
  );
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:1353/",
    projectId: "aps8et",
    specPattern: "cypress/collaborative/federated.cy.ts",
    setupNodeEvents(on, config) {
      on("before:run", startServer);
      on("after:spec", stopParticipant);
      on("after:run", stopServer);
      on("task", {
        startFederatedParticipant: async () =>
          await startParticipant(config.projectRoot),
        awaitFederatedParticipant: awaitParticipant,
        stopFederatedParticipant: async () => {
          await stopParticipant();
          return null;
        },
      });
    },
  },
});
