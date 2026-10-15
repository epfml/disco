import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";

const browsers = ["chrome", "edge", "firefox", "firefox"];

const children: ChildProcessWithoutNullStreams[] = [];

function stopChildren(): void {
  for (const child of children) {
    if (child.pid === undefined || child.exitCode !== null) continue;
    try {
      process.kill(-child.pid, "SIGTERM"); // minus sign means kill both cypress and its browser
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ESRCH")
      )
        throw error;
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    stopChildren();
    process.exitCode = 1;
  });

let firstFailedBrowser: string | undefined;

const results = browsers.map((browser, index) => {
  const label = `${browser}-${index + 1}`;
  const child = spawn(
    "pnpm",
    [
      "exec",
      "cypress",
      "run",
      "--e2e",
      "--browser",
      browser,
      "--spec",
      "cypress/e2e/training/decentralized/mnist.cy.ts",
      "--config",
      `screenshotsFolder=cypress/screenshots/${label}`,
      "--env",
      `expectedBrowser=${browser},numberOfParticipants=${browsers.length}`,
    ],
    {
      detached: true,
      stdio: "pipe",
      env: {
        ...process.env,
        DISCO_TRAINING_E2E: "1",
      },
    },
  );
  child.stdin.end();
  children.push(child);
  for (const output of [child.stdout, child.stderr])
    createInterface({ input: output }).on("line", (line) =>
      console.log(`[${label}] ${line}`),
    );

  return new Promise<boolean>((resolve) => {
    child.once("error", (error) => {
      firstFailedBrowser ??= label;
      console.error(`[${label}] ${error}`);
      stopChildren();
      resolve(false);
    });
    child.once("exit", (code, signal) => {
      const passed = code === 0;
      if (!passed) {
        firstFailedBrowser ??= label;
        console.error(`[${label}] exited with ${code ?? signal}`);
        stopChildren();
      }
      resolve(passed);
    });
  });
});

if ((await Promise.all(results)).some((passed) => !passed)) {
  if (firstFailedBrowser !== undefined)
    console.error(`First browser to fail: ${firstFailedBrowser}`);
  process.exitCode = 1;
}
