import "@tensorflow/tfjs-node";

import type * as http from "node:http";

import {
  DecentralizedClient,
  defaultModels,
  defaultTasks,
  MeanAggregator,
  WeightsContainer,
} from "@epfml/discojs";
import { defineConfig } from "cypress";
import { Server } from "server";

const SERVER_PORT = 8081;
// The default CIFAR-10 task allows four 60-second peer-connection attempts
// before the server rejects a peer. Keep the harness just above that protocol
// deadline while remaining below the five-minute CI target.
const PEER_TIMEOUT_MS = 270_000;

interface PeerResult {
  readonly id: string;
  readonly weights: number[];
}

interface PeerRun {
  readonly result: Promise<PeerResult[]>;
  readonly cancelTimeout: () => void;
  readonly close: () => Promise<void>;
}

let serverHandle: http.Server | undefined;
let serverUrl: URL | undefined;
let peers: PeerRun | undefined;

async function startServer(): Promise<void> {
  if (serverHandle !== undefined) return;

  const server = await Server.with(
    [defaultModels.CIFAR10Classifier],
    [defaultTasks.cifar10],
  );
  [serverHandle, serverUrl] = await server.serve(SERVER_PORT);
}

async function startPeers(): Promise<null> {
  if (peers !== undefined)
    throw new Error("the decentralized Node peers are already running");
  if (serverUrl === undefined)
    throw new Error("the decentralized test server is not running");

  const task = await defaultTasks.cifar10.getTask();
  const clients = [0, 1].map(
    () =>
      new DecentralizedClient(
        serverUrl!,
        task,
        new MeanAggregator(0, 1, "relative"),
      ),
  );
  let closePromise: Promise<void> | undefined;
  const close = () =>
    (closePromise ??= Promise.allSettled(
      clients.map(async (client) => await client.disconnect()),
    ).then(() => undefined));

  const communicating = Promise.all(
    clients.map(async (client, index): Promise<PeerResult> => {
      await client.connect();
      await client.onRoundBeginCommunication();
      const weights = await client.onRoundEndCommunication(
        WeightsContainer.of([index + 1, index + 2]),
      );
      return {
        id: client.ownId,
        weights: Array.from(weights.weights[0].dataSync()),
      };
    }),
  ).finally(close);

  let timeout: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      void close();
      reject(
        new Error(
          `the decentralized Node peers did not finish within ${PEER_TIMEOUT_MS / 1000}s`,
        ),
      );
    }, PEER_TIMEOUT_MS);
  });
  const cancelTimeout = () => {
    if (timeout !== undefined) clearTimeout(timeout);
    timeout = undefined;
  };
  const result = Promise.race([communicating, deadline]).finally(cancelTimeout);
  void result.catch(() => undefined);
  peers = { result, cancelTimeout, close };

  return null;
}

async function awaitPeers(): Promise<PeerResult[]> {
  if (peers === undefined)
    throw new Error("the decentralized Node peers were not started");
  return await peers.result;
}

async function stopPeers(): Promise<void> {
  const running = peers;
  peers = undefined;
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
  await stopPeers();

  const handle = serverHandle;
  serverHandle = undefined;
  serverUrl = undefined;
  if (handle === undefined) return;

  handle.closeAllConnections();
  handle.close();
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:1354/",
    projectId: "aps8et",
    specPattern: "cypress/collaborative/decentralized.cy.ts",
    setupNodeEvents(on) {
      on("before:run", startServer);
      on("after:spec", stopPeers);
      on("after:run", stopServer);
      on("task", {
        startDecentralizedPeers: startPeers,
        awaitDecentralizedPeers: awaitPeers,
        stopDecentralizedPeers: async () => {
          await stopPeers();
          return null;
        },
      });
    },
  },
});
