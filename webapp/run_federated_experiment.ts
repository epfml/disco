import "@tensorflow/tfjs-node";
import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

import { Server } from "server";
import { defaultModels, defaultTasks, Disco } from "@epfml/discojs";
import { loadText } from "@epfml/discojs-node";

const CHROME_PATH =
  "/home/ale/.cache/codex-chrome/chrome/linux-154.0.8037.57/chrome-linux64/chrome";
const SERVER_PORT = 8080;
const VITE_PORT = 1351;
const CDP_PORT = 9223;
const EPOCHS = 10;
const ROUND_DURATION = 1;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404 || res.status === 200) return;
    } catch {
      // wait and retry
    }
    await sleep(200);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  console.log("==================================================================");
  console.log(`Starting Federated Shakespeare Training with 3 Participants (${EPOCHS} rounds)`);
  console.log("==================================================================");

  let viteProc: ChildProcess | undefined;
  let chromeProc: ChildProcess | undefined;
  let chromeTempDir: string | undefined;
  let httpServer: any | undefined;

  try {
    // 1. Start DISCO Federated Server
    console.log(`\n[1/5] Starting DISCO Federated Server on port ${SERVER_PORT}...`);
    const federatedShakespeare = {
      modelCard: defaultModels.Shakespeare,
      async getTask() {
        const task = await defaultTasks.shakespeare.getTask();
        return {
          ...task,
          trainingInformation: {
            ...task.trainingInformation,
            scheme: "federated" as const,
            minNbOfParticipants: 3,
            epochs: EPOCHS,
            roundDuration: ROUND_DURATION,
          },
        };
      },
    };
    const serverInstance = await Server.with(
      [defaultModels.Shakespeare],
      [federatedShakespeare],
    );
    const [srv, serverUrl] = await serverInstance.serve(SERVER_PORT);
    httpServer = srv;
    console.log(`✓ DISCO Server listening on ${serverUrl.toString()}`);

    // 2. Start Vite Dev Server
    console.log(`\n[2/5] Starting Vite Dev Server on port ${VITE_PORT}...`);
    viteProc = spawn("pnpm", ["exec", "vite", "--port", String(VITE_PORT), "--strictPort"], {
      cwd: path.resolve(import.meta.dirname),
      stdio: "pipe",
    });

    viteProc.stderr?.on("data", (data) => {
      const s = data.toString();
      if (!s.includes("deprecated") && !s.includes("NODE_OPTIONS")) {
        console.error(`[Vite stderr] ${s.trim()}`);
      }
    });

    await waitForHttp(`http://localhost:${VITE_PORT}/federated_webgpu.html`);
    console.log(`✓ Vite is ready at http://localhost:${VITE_PORT}/`);

    // 3. Launch Chrome with WebGPU flags and CDP
    console.log(`\n[3/5] Launching Chrome 154 with WebGPU on port ${CDP_PORT}...`);
    chromeTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chrome-webgpu-"));
    const chromeArgs = [
      "--enable-unsafe-webgpu",
      "--use-angle=vulkan",
      "--enable-features=Vulkan",
      "--disable-software-rasterizer",
      `--remote-debugging-port=${CDP_PORT}`,
      "--remote-allow-origins=*",
      `--user-data-dir=${chromeTempDir}`,
      "--headless=new",
      "--no-sandbox",
      "about:blank",
    ];

    chromeProc = spawn(CHROME_PATH, chromeArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/version`, 15000);
    const versionRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
    const versionData = await versionRes.json();
    console.log(`✓ Chrome launched: ${versionData.Browser}`);

    // Connect to CDP page
    const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const pages = await listRes.json();
    const wsUrl = pages[0].webSocketDebuggerUrl;
    const cdpWs = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      cdpWs.onopen = resolve;
      cdpWs.onerror = reject;
    });

    let cdpMsgId = 1;
    function sendCdp(method: string, params: Record<string, unknown> = {}) {
      return new Promise<any>((resolve, reject) => {
        const id = cdpMsgId++;
        const timeout = setTimeout(() => {
          cdpWs.removeEventListener("message", handler);
          reject(new Error(`CDP method ${method} timed out`));
        }, 300000);

        const handler = (event: MessageEvent) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            clearTimeout(timeout);
            cdpWs.removeEventListener("message", handler);
            if (data.error) reject(new Error(JSON.stringify(data.error)));
            else resolve(data.result);
          }
        };
        cdpWs.addEventListener("message", handler);
        cdpWs.send(JSON.stringify({ id, method, params }));
      });
    }

    // Capture console output from Chrome WebGPU
    cdpWs.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.method === "Runtime.consoleAPICalled") {
          const text = msg.params.args.map((a: any) => a.value ?? a.description ?? "").join(" ");
          if (text.includes("Loss:") || text.includes("Starting Round") || text.includes("Completed Round") || text.includes("modelSynced") || text.includes("structure:") || text.includes("Tokens:") || text.includes("Prompt:")) {
            console.log(`[Chrome WebGPU] ${text}`);
          }
        }
      } catch {}
    });

    await sendCdp("Runtime.enable");
    await sendCdp("Page.enable");

    // 4. Start 2 Node Peers
    console.log("\n[4/5] Connecting 2 Node peers concurrently...");
    const task = await federatedShakespeare.getTask();

    const nodePeer1 = new Disco(task, serverUrl, {
      preprocessOnce: true,
      debugLabel: "node-peer-1",
    });
    const nodePeer2 = new Disco(task, serverUrl, {
      preprocessOnce: true,
      debugLabel: "node-peer-2",
    });

    const datasetPath1 = path.resolve(import.meta.dirname, "../datasets/shakespeare/shard_node_1.txt");
    const datasetPath2 = path.resolve(import.meta.dirname, "../datasets/shakespeare/shard_node_2.txt");

    const dataset1 = loadText(datasetPath1);
    const dataset2 = loadText(datasetPath2);

    const node1Logs: Array<{ round: number; epoch: number; loss: number; accuracy: number }> = [];
    const node2Logs: Array<{ round: number; epoch: number; loss: number; accuracy: number }> = [];

    let node1Synced = 0;
    let node2Synced = 0;
    nodePeer1.on("modelSynced", () => {
      node1Synced++;
      console.log(`[Node Peer 1] modelSynced received! Aggregated global weights updated (count=${node1Synced})`);
    });
    nodePeer2.on("modelSynced", () => {
      node2Synced++;
      console.log(`[Node Peer 2] modelSynced received! Aggregated global weights updated (count=${node2Synced})`);
    });

    console.log("Starting federated training on Node Peer 1 & Node Peer 2...");
    const nodeTrainingPromise = Promise.all([
      (async () => {
        let r = 0;
        for await (const round of nodePeer1.train(dataset1)) {
          r++;
          let e = 0;
          for await (const epoch of round) {
            e++;
            for await (const batch of epoch) {
              node1Logs.push({ round: r, epoch: e, loss: batch.loss, accuracy: batch.accuracy });
              console.log(`[Node Peer 1] Round ${r} Epoch ${e} Loss: ${batch.loss.toFixed(4)}`);
            }
          }
        }
        console.log("✓ Node Peer 1 training finished.");
        return { peer: 1, logs: node1Logs };
      })(),
      (async () => {
        let r = 0;
        for await (const round of nodePeer2.train(dataset2)) {
          r++;
          let e = 0;
          for await (const epoch of round) {
            e++;
            for await (const batch of epoch) {
              node2Logs.push({ round: r, epoch: e, loss: batch.loss, accuracy: batch.accuracy });
              console.log(`[Node Peer 2] Round ${r} Epoch ${e} Loss: ${batch.loss.toFixed(4)}`);
            }
          }
        }
        console.log("✓ Node Peer 2 training finished.");
        return { peer: 2, logs: node2Logs };
      })(),
    ]);

    // 5. Navigate Chrome to WebGPU federated participant page
    console.log("\n[5/5] Navigating Chrome to WebGPU federated participant page...");
    const targetUrl = `http://localhost:${VITE_PORT}/federated_webgpu.html?backend=webgpu&serverUrl=http://localhost:${SERVER_PORT}&epochs=${EPOCHS}&roundDuration=${ROUND_DURATION}`;
    await sendCdp("Page.navigate", { url: targetUrl });

    // Poll for WebGPU peer completion
    console.log("Waiting for 3-participant training & inference completion in WebGPU Chrome...");
    let webgpuResults: any = undefined;
    const maxWait = 300000;
    const pollStart = Date.now();

    while (Date.now() - pollStart < maxWait) {
      await sleep(1000);
      try {
        const evalRes = await sendCdp("Runtime.evaluate", {
          expression: `(() => {
            const status = document.getElementById("status")?.textContent;
            const res = window.__SHAKESPEARE_RESULTS__;
            const err = window.__SHAKESPEARE_ERROR__;
            return { status, res, err };
          })()`,
          returnByValue: true,
        });

        const val = evalRes.result?.value;
        if (val?.err) {
          throw new Error(`WebGPU peer reported error: ${val.err}`);
        }
        if (val?.status === "COMPLETED" && val?.res) {
          webgpuResults = val.res;
          break;
        }
      } catch (e: any) {
        if (e.message?.includes("WebGPU peer reported error")) throw e;
      }
    }

    if (!webgpuResults) {
      throw new Error("Timed out waiting for WebGPU participant completion");
    }

    // Await Node peers completion
    await nodeTrainingPromise;
    console.log("✓ All 3 participants have completed federated training and aggregation!");

    // Clean up connections
    await nodePeer1.close().catch(() => {});
    await nodePeer2.close().catch(() => {});
    cdpWs.close();

    console.log("\n==================================================================");
    console.log("FEDERATED EXPERIMENT AND INFERENCE RESULTS");
    console.log("==================================================================");
    console.log("\n1. 3-Participant Federated Training Summary:");
    console.log(`   - Server scheme: ${task.trainingInformation.scheme}`);
    console.log(`   - Min participants required: ${task.trainingInformation.minNbOfParticipants}`);
    console.log(`   - Rounds completed: ${EPOCHS}`);
    console.log(`   - Participants:`);
    console.log(`     * Peer 1 (Node tfjs-node): ${node1Logs.length} batches, modelSynced events: ${node1Synced}`);
    console.log(`     * Peer 2 (Node tfjs-node): ${node2Logs.length} batches, modelSynced events: ${node2Synced}`);
    console.log(`     * Peer 3 (Chrome WebGPU): ${webgpuResults?.batchLogs?.length ?? 0} batches, modelSynced events: ${webgpuResults?.syncEventCount ?? 0}`);
    console.log(`   - Federated aggregation completed: YES`);
    console.log(`   - WebGPU final weights sum: ${webgpuResults?.finalWeightSum}`);

    console.log("\n2. Losses Across Participants & Batches:");
    console.log("   Node Peer 1 batches:");
    for (const b of node1Logs) {
      console.log(`     Round ${b.round}, Epoch ${b.epoch}: Loss = ${b.loss.toFixed(4)}`);
    }
    console.log("   Node Peer 2 batches:");
    for (const b of node2Logs) {
      console.log(`     Round ${b.round}, Epoch ${b.epoch}: Loss = ${b.loss.toFixed(4)}`);
    }
    console.log("   WebGPU Peer 3 batches:");
    if (webgpuResults?.batchLogs) {
      for (const b of webgpuResults.batchLogs) {
        console.log(`     Round ${b.round}, Epoch ${b.epoch}: Loss = ${b.loss.toFixed(4)}`);
      }
    }

    console.log("\n3. WebGPU Model Inference & Prediction Shape Validation:");
    console.log(`   - Backend: ${webgpuResults?.backend}`);
    console.log(`   - Prompt: "${webgpuResults?.prompt}"`);
    console.log(`   - Prompt token count: ${webgpuResults?.promptTokens?.length}`);
    console.log(`   - LayersModel.predict() output tensor shape: [${webgpuResults?.rawLayersModelOutputShape?.join(", ")}] (Rank ${webgpuResults?.rawLayersModelOutputRank})`);
    console.log(`   - probs.argMax() tensor shape on WebGPU: [${webgpuResults?.argMaxShape?.join(", ")}] (Rank ${webgpuResults?.argMaxRank}, Value: ${JSON.stringify(webgpuResults?.argMaxValue)})`);
    console.log(`   - Greedy model.predict() output: ${JSON.stringify(webgpuResults?.greedyBatchResult)}`);
    console.log(`     Shape structure: ${webgpuResults?.greedyShapeDescription}`);
    console.log(`   - Sampled model.predict() output: ${JSON.stringify(webgpuResults?.sampledBatchResult)}`);
    console.log(`     Shape structure: ${webgpuResults?.sampledShapeDescription}`);

    console.log("\n4. Text Generation Results:");
    console.log("   [Greedy Decoding (20 tokens)]:");
    console.log(`     Tokens: [${webgpuResults?.greedyNewTokens?.join(", ")}]`);
    console.log(`     Continuation representation: ${JSON.stringify(webgpuResults?.greedyContinuationText)}`);
    console.log(`     Full Decoded Text:\n${webgpuResults?.greedyFullText}`);

    console.log("\n   [Sampled Decoding (20 tokens, temp=0.8, topk=40)]:");
    console.log(`     Tokens: [${webgpuResults?.sampledNewTokens?.join(", ")}]`);
    console.log(`     Continuation representation: ${JSON.stringify(webgpuResults?.sampledContinuationText)}`);
    console.log(`     Full Decoded Text:\n${webgpuResults?.sampledFullText}`);

    // Save full JSON report
    const reportPath = path.resolve(import.meta.dirname, "../federated_shakespeare_webgpu_report.json");
    await fs.writeFile(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          server: { port: SERVER_PORT, scheme: task.trainingInformation.scheme, minParticipants: task.trainingInformation.minNbOfParticipants },
          nodePeer1: { synced: node1Synced, batches: node1Logs },
          nodePeer2: { synced: node2Synced, batches: node2Logs },
          webgpuPeer: webgpuResults,
        },
        null,
        2,
      ),
    );
    console.log(`\n✓ Detailed JSON report saved to: ${reportPath}`);
    console.log("==================================================================");
  } finally {
    if (chromeProc) {
      chromeProc.kill("SIGKILL");
    }
    if (viteProc) {
      viteProc.kill("SIGKILL");
    }
    if (httpServer) {
      httpServer.close();
    }
    if (chromeTempDir) {
      await fs.rm(chromeTempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Experiment failed with error:", err);
      process.exit(1);
    });
