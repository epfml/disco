import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import * as fs from "node:fs/promises";
import path from "node:path";
import { createInterface, type Interface } from "node:readline";

import { defineConfig } from "cypress";

const RUN_TIMEOUT_MS = 270_000;
const HARNESS_READY_TIMEOUT_MS = 60_000;
const STOP_RUN_TIMEOUT_MS = 15_000;

interface TrainingPeerResult {
  readonly rounds: number;
  readonly epochs: number;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

interface HarnessRun {
  readonly child: ChildProcessWithoutNullStreams;
  readonly lines: Interface;
  readonly ready: Deferred<void>;
  training?: Deferred<TrainingPeerResult[]>;
  runTimeout?: NodeJS.Timeout;
  stopping?: Deferred<void>;
  stopPromise?: Promise<void>;
}

let harness: HarnessRun | undefined;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function startHarness(projectRoot: string): Promise<void> {
  if (harness !== undefined) return;

  const ready = deferred<void>();
  const child = spawn(
    "node",
    [
      "--experimental-strip-types",
      path.resolve(projectRoot, "cypress/support/decentralized_harness.ts"),
    ],
    { cwd: projectRoot },
  );
  const lines = createInterface({ input: child.stdout });
  const running: HarnessRun = { child, lines, ready };
  harness = running;

  child.stderr.pipe(process.stderr);
  lines.on("line", (line) => {
    if (line === "DISCO_E2E_SERVER_READY") {
      ready.resolve();
    } else if (line.startsWith("DISCO_E2E_TRAINING_RESULT ")) {
      const result = line.slice("DISCO_E2E_TRAINING_RESULT ".length);
      running.training?.resolve(JSON.parse(result) as TrainingPeerResult[]);
    } else if (line.startsWith("DISCO_E2E_RUN_ERROR ")) {
      const error = new Error(line.slice("DISCO_E2E_RUN_ERROR ".length));
      running.training?.reject(error);
    } else if (line === "DISCO_E2E_RUN_STOPPED") {
      running.stopping?.resolve();
    } else {
      console.log(`[decentralized harness] ${line}`);
    }
  });
  child.once("error", (error) => {
    ready.reject(error);
    running.training?.reject(error);
    running.stopping?.reject(error);
  });
  child.once("exit", (code, signal) => {
    const error = new Error(
      `the decentralized harness exited unexpectedly (code ${String(code)}, signal ${String(signal)})`,
    );
    ready.reject(error);
    running.training?.reject(error);
    running.stopping?.reject(error);
  });

  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      ready.promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(new Error("the decentralized harness did not become ready")),
          HARNESS_READY_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function startTraining(projectRoot: string): null {
  if (harness === undefined)
    throw new Error("the decentralized test harness is not running");
  ensureNoActiveRun();
  const training = deferred<TrainingPeerResult[]>();
  void training.promise.catch(() => undefined);
  harness.training = training;
  startRunTimeout();
  harness.child.stdin.write(
    `${JSON.stringify({
      type: "start-training",
      datasetPath: path.resolve(projectRoot, "../datasets/CIFAR10"),
    })}\n`,
  );
  return null;
}

function ensureNoActiveRun(): void {
  if (harness?.training !== undefined)
    throw new Error("a decentralized harness run is already active");
}

function startRunTimeout(): void {
  if (harness === undefined) return;
  harness.runTimeout = setTimeout(() => {
    const error = new Error(
      `the decentralized training run did not finish within ${RUN_TIMEOUT_MS / 1000}s`,
    );
    harness?.training?.reject(error);
    void stopRun();
  }, RUN_TIMEOUT_MS);
}

async function awaitTraining(): Promise<TrainingPeerResult[]> {
  if (harness?.training === undefined)
    throw new Error("the decentralized training peers were not started");
  return await harness.training.promise;
}

async function stopRun(): Promise<void> {
  const running = harness;
  if (running === undefined) return;
  if (running.stopPromise !== undefined) return await running.stopPromise;

  if (running.runTimeout !== undefined) clearTimeout(running.runTimeout);
  running.runTimeout = undefined;
  running.training = undefined;
  const stopping = deferred<void>();
  running.stopping = stopping;
  const stopPromise = Promise.race([
    stopping.promise,
    new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(new Error("the decentralized training peers did not stop")),
        STOP_RUN_TIMEOUT_MS,
      );
    }),
  ]).finally(() => {
    if (running.stopPromise === stopPromise) {
      running.stopPromise = undefined;
      running.stopping = undefined;
    }
  });
  running.stopPromise = stopPromise;
  running.child.stdin.write('{"type":"stop-run"}\n');
  await stopPromise;
}

async function stopHarness(): Promise<void> {
  const running = harness;
  harness = undefined;
  if (running === undefined) return;

  if (running.runTimeout !== undefined) clearTimeout(running.runTimeout);
  running.lines.close();
  running.child.kill("SIGTERM");
  const exited = new Promise<void>((resolve) =>
    running.child.once("exit", resolve),
  );
  let timeout: NodeJS.Timeout | undefined;
  await Promise.race([
    exited,
    new Promise<void>((resolve) => {
      timeout = setTimeout(() => {
        running.child.kill("SIGKILL");
        resolve();
      }, 5_000);
    }),
  ]);
  if (timeout !== undefined) clearTimeout(timeout);
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:1354/",
    projectId: "aps8et",
    specPattern: "cypress/collaborative/decentralized.cy.ts",
    setupNodeEvents(on, config) {
      on("before:run", async () => await startHarness(config.projectRoot));
      on("after:spec", stopRun);
      on("after:run", stopHarness);
      on("task", {
        readdir: async (directory: string) =>
          (await fs.readdir(directory)).map((file) =>
            path.join(directory, file),
          ),
        startDecentralizedTrainingPeers: () =>
          startTraining(config.projectRoot),
        awaitDecentralizedTrainingPeers: awaitTraining,
        stopDecentralizedTrainingPeers: stopRun,
      });
    },
  },
});
