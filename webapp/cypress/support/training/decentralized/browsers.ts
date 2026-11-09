import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { setTimeout } from "node:timers/promises";
import { stripVTControlCharacters } from "node:util";

const browsers = ["chrome", "chrome", "edge", "firefox"];

// Starting four Cypress runs and four browsers at the same moment saturates
// the CI runner: browsers then take close to Cypress's 60s connect budget, and
// Edge sometimes misses it. So start the runs a few seconds apart and give each
// browser more time to connect.
const launchSpacingMs = 10_000;
const browserConnectTimeoutMs = 120_000;

// A run whose test never started never joined the training: run Cypress again
// for that browser alone, leaving the other peers running. It happens when
// - the browser doesn't connect in time: Cypress gives up after 3 launches
//   ("Tests: 0") or crashes while relaunching (`relaunchBrowser`, no results)
// - the spec loads empty ("Tests: 0", yet Cypress exits with 0)
const maxAttempts = 2;
const didNotConnectMessage = "Timed out waiting for the browser to connect";
const testsCountPattern = /Tests:\s+(\d+)/;

const children = new Set<ChildProcessWithoutNullStreams>();
let stopping = false;

function stopChild(child: ChildProcessWithoutNullStreams): void {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, "SIGTERM"); // minus sign means kill both cypress and its browser
  } catch (error) {
    // ESRCH: already gone, EPERM: only zombies left (macOS)
    const code = error instanceof Error && "code" in error && error.code;
    if (code !== "ESRCH" && code !== "EPERM") throw error;
  }
}

function stopChildren(): void {
  stopping = true;
  for (const child of children) stopChild(child);
}

for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    stopChildren();
    process.exitCode = 1;
  });

interface RunResult {
  passed: boolean;
  /** The test never started in the browser */
  didNotStart: boolean;
}

function runCypress(browser: string, label: string): Promise<RunResult> {
  // Cypress writes the spec bundle in its app data, shared by every run of
  // the project: a run can load it while another one rewrites it, and find no
  // test. On Linux, the app data follows XDG_CONFIG_HOME, so give each its own.
  const appData = join(tmpdir(), "disco-e2e-decentralized", label);
  mkdirSync(appData, { recursive: true });

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
        XDG_CONFIG_HOME: appData,
        CYPRESS_INTERNAL_BROWSER_CONNECT_TIMEOUT: `${browserConnectTimeoutMs}`,
      },
    },
  );
  child.stdin.end();
  children.add(child);

  let didNotConnect = false;
  let testsCount: number | undefined;
  for (const output of [child.stdout, child.stderr])
    createInterface({ input: output }).on("line", (line) => {
      console.log(`[${label}] ${line}`);
      const text = stripVTControlCharacters(line);
      if (text.includes(didNotConnectMessage)) didNotConnect = true;
      const count = testsCountPattern.exec(text)?.[1];
      if (count !== undefined) testsCount = Number(count);
    });

  return new Promise((resolve) => {
    child.once("error", (error) => {
      console.error(`[${label}] ${error}`);
      children.delete(child);
      resolve({ passed: false, didNotStart: false });
    });
    child.once("exit", (code, signal) => {
      const passed = code === 0 && testsCount !== undefined && testsCount > 0;
      if (!passed && !stopping) {
        console.error(
          `[${label}] exited with ${code ?? signal} after running ${testsCount ?? "no"} tests`,
        );
        stopChild(child); // the browser could outlive a crashed Cypress
      }
      children.delete(child);
      resolve({
        passed,
        didNotStart:
          testsCount === 0 || (testsCount === undefined && didNotConnect),
      });
    });
  });
}

/** Verify the Cypress binary once instead of in every run at the same time */
async function verifyCypress(): Promise<boolean> {
  const child = spawn("pnpm", ["exec", "cypress", "verify"], {
    stdio: "inherit",
  });
  const code = await new Promise<number | null>((resolve) => {
    child.once("error", () => resolve(null));
    child.once("exit", resolve);
  });
  return code === 0;
}

let firstFailedBrowser: string | undefined;

async function runBrowser(browser: string, index: number): Promise<boolean> {
  const label = `${browser}-${index + 1}`;
  await setTimeout(index * launchSpacingMs);

  for (let attempt = 1; !stopping; attempt++) {
    const { passed, didNotStart } = await runCypress(browser, label);
    if (passed) return true;
    if (stopping) break;

    if (didNotStart && attempt < maxAttempts) {
      console.error(
        `[${label}] test never started, running Cypress again (attempt ${attempt + 1}/${maxAttempts})`,
      );
      continue;
    }

    firstFailedBrowser ??= label;
    stopChildren();
  }
  return false;
}

if (!(await verifyCypress())) {
  console.error("Cypress verification failed");
  process.exit(1);
}
const results = await Promise.all(browsers.map(runBrowser));
if (results.some((passed) => !passed)) {
  if (firstFailedBrowser !== undefined)
    console.error(`First browser to fail: ${firstFailedBrowser}`);
  process.exitCode = 1;
}
