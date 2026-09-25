import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import { createInterface, type Interface } from "node:readline";

import { defineConfig } from "cypress";

const PARTICIPANT_TIMEOUT_MS = 4 * 60_000;
const HARNESS_READY_TIMEOUT_MS = 60_000;

interface ParticipantResult {
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
  participant?: Deferred<ParticipantResult>;
  participantTimeout?: NodeJS.Timeout;
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
      path.resolve(projectRoot, "cypress/support/federated_harness.ts"),
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
    } else if (line.startsWith("DISCO_E2E_PARTICIPANT_RESULT ")) {
      const result = line.slice("DISCO_E2E_PARTICIPANT_RESULT ".length);
      running.participant?.resolve(JSON.parse(result) as ParticipantResult);
    } else if (line.startsWith("DISCO_E2E_PARTICIPANT_ERROR ")) {
      const error = line.slice("DISCO_E2E_PARTICIPANT_ERROR ".length);
      running.participant?.reject(new Error(error));
    } else {
      console.log(`[federated harness] ${line}`);
    }
  });
  child.once("error", (error) => {
    ready.reject(error);
    running.participant?.reject(error);
  });
  child.once("exit", (code, signal) => {
    const error = new Error(
      `the federated harness exited unexpectedly (code ${String(code)}, signal ${String(signal)})`,
    );
    ready.reject(error);
    running.participant?.reject(error);
  });

  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      ready.promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("the federated harness did not become ready")),
          HARNESS_READY_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function startParticipant(projectRoot: string): null {
  if (harness === undefined)
    throw new Error("the federated test harness is not running");
  if (harness.participant !== undefined)
    throw new Error("the federated Node participant is already running");

  const participant = deferred<ParticipantResult>();
  void participant.promise.catch(() => undefined);
  harness.participant = participant;
  harness.participantTimeout = setTimeout(() => {
    participant.reject(
      new Error(
        `the federated Node participant did not finish within ${PARTICIPANT_TIMEOUT_MS / 1000}s`,
      ),
    );
    harness?.child.stdin.write('{"type":"stop-participant"}\n');
  }, PARTICIPANT_TIMEOUT_MS);
  harness.child.stdin.write(
    `${JSON.stringify({
      type: "start-participant",
      datasetPath: path.resolve(projectRoot, "../datasets/titanic_train.csv"),
    })}\n`,
  );
  return null;
}

async function awaitParticipant(): Promise<ParticipantResult> {
  if (harness?.participant === undefined)
    throw new Error("the federated Node participant was not started");
  return await harness.participant.promise;
}

function stopParticipant(): null {
  if (harness === undefined) return null;
  if (harness.participantTimeout !== undefined)
    clearTimeout(harness.participantTimeout);
  harness.participantTimeout = undefined;
  harness.participant = undefined;
  harness.child.stdin.write('{"type":"stop-participant"}\n');
  return null;
}

async function stopHarness(): Promise<void> {
  const running = harness;
  harness = undefined;
  if (running === undefined) return;

  if (running.participantTimeout !== undefined)
    clearTimeout(running.participantTimeout);
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
    baseUrl: "http://localhost:1353/",
    projectId: "aps8et",
    specPattern: "cypress/collaborative/federated.cy.ts",
    setupNodeEvents(on, config) {
      on("before:run", async () => await startHarness(config.projectRoot));
      on("after:spec", () => {
        stopParticipant();
      });
      on("after:run", stopHarness);
      on("task", {
        startFederatedParticipant: () => startParticipant(config.projectRoot),
        awaitFederatedParticipant: awaitParticipant,
        stopFederatedParticipant: stopParticipant,
      });
    },
  },
});
