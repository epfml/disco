import "./buffer-polyfill";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";
import { Disco, defaultTasks, GPT } from "@epfml/discojs";
import { loadText } from "@epfml/discojs-web";
import { List } from "immutable";

function log(msg: string): void {
  console.log(msg);
  const logEl = document.getElementById("log");
  if (logEl) {
    logEl.textContent += msg + "\n";
  }
}

function setStatus(status: string): void {
  console.log(`[Status] ${status}`);
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.textContent = status;
  }
}

async function run(): Promise<void> {
  try {
    setStatus("STARTING");
    const urlParams = new URLSearchParams(window.location.search);
    const backend = urlParams.get("backend") ?? "webgpu";
    log(`Setting backend to: ${backend}`);
    await tf.setBackend(backend);
    await tf.ready();
    const activeBackend = tf.getBackend();
    log(`Active backend verified: ${activeBackend}`);

    if (activeBackend !== backend) {
      throw new Error(`Failed to activate requested backend ${backend}, got ${activeBackend}`);
    }

    const serverUrl = new URL(urlParams.get("serverUrl") ?? "http://localhost:8080");
    log(`Server URL: ${serverUrl.toString()}`);

    // Load WebGPU participant shard
    log("Fetching shard for WebGPU participant...");
    const shardResponse = await fetch("/datasets/shakespeare/shard_webgpu.txt");
    if (!shardResponse.ok) {
      throw new Error(`Failed to fetch shard: ${shardResponse.statusText}`);
    }
    const shardText = await shardResponse.text();
    log(`Shard loaded: ${shardText.length} characters, ${shardText.split("\n").length} lines`);

    const dataset = loadText(new Blob([shardText]));

    // Initialize task and Disco client
    const epochs = Number(urlParams.get("epochs") ?? "10");
    const roundDuration = Number(urlParams.get("roundDuration") ?? "1");
    const baseTask = await defaultTasks.shakespeare.getTask();
    const task = {
      ...baseTask,
      trainingInformation: {
        ...baseTask.trainingInformation,
        scheme: "federated" as const,
        minNbOfParticipants: 3,
        epochs,
        roundDuration,
      },
    };
    log(`Task loaded: ${task.id}, scheme: ${task.trainingInformation.scheme}, minPeers: ${task.trainingInformation.minNbOfParticipants}, epochs: ${epochs}, roundDuration: ${roundDuration}`);

    const disco = new Disco(task as any, serverUrl, {
      preprocessOnce: true,
      debugLabel: "webgpu-browser-peer",
    });

    let syncEventCount = 0;
    disco.on("participants", (n) => log(`[Event] Number of participants: ${n}`));
    disco.on("status", (s) => log(`[Event] Status: ${s}`));
    disco.on("modelSynced", () => {
      syncEventCount++;
      log(`[Event] modelSynced received! Aggregated global weights updated (count=${syncEventCount})`);
    });

    setStatus("TRAINING");
    log("Starting federated training...");

    const batchLogs: Array<{ batchNum: number; round: number; epoch: number; loss: number; accuracy: number }> = [];
    let roundNum = 0;
    let totalBatchCount = 0;

    for await (const round of disco.train(dataset)) {
      roundNum++;
      log(`--> Starting Round ${roundNum}`);
      let epochNum = 0;
      for await (const epoch of round) {
        epochNum++;
        for await (const batch of epoch) {
          totalBatchCount++;
          batchLogs.push({
            batchNum: totalBatchCount,
            round: roundNum,
            epoch: epochNum,
            loss: batch.loss,
            accuracy: batch.accuracy,
          });
          log(`  [Round ${roundNum} Epoch ${epochNum} Batch ${totalBatchCount}] Loss: ${batch.loss.toFixed(4)}, Acc: ${batch.accuracy.toFixed(4)}`);
        }
      }
      log(`<-- Completed Round ${roundNum}`);
    }

    log(`Training finished after ${roundNum} rounds and ${totalBatchCount} batches.`);
    setStatus("INFERENCE");

    // Retrieve trained model after federated aggregation
    const trainedModel = disco.trainer.model as GPT;
    const weightsList = trainedModel.weights.weights;
    const finalWeightSum = weightsList.reduce((acc, t) => acc + (t.sum().arraySync() as number), 0);
    log(`Federated aggregated model weight sum: ${finalWeightSum.toFixed(4)} across ${weightsList.length} tensors`);

    // Model Inference & Shape Validation
    const prompt = "First Citizen: Before we proceed";
    const tokenizer = task.trainingInformation.tokenizer;
    const promptTokens = tokenizer.tokenize(prompt);
    log(`Prompt: "${prompt}"`);
    log(`Prompt token IDs: [${promptTokens.toArray().join(", ")}] (count: ${promptTokens.size})`);

    // 1. Inspect direct LayersModel predict output tensor shape
    const contextLength = task.trainingInformation.contextLength;
    const inputSlice = promptTokens.slice(-contextLength);
    const inputTensor = tf.tidy(() =>
      tf.tensor1d(inputSlice.toArray(), "int32").expandDims<tf.Tensor2D>(0)
    );
    const rawOutputTensor = trainedModel.extract().predict(inputTensor) as tf.Tensor;
    const rawLayersModelOutputShape = rawOutputTensor.shape;
    const rawLayersModelOutputRank = rawOutputTensor.rank;
    log(`LayersModel.predict() input shape: [${inputTensor.shape.join(", ")}], output shape: [${rawLayersModelOutputShape.join(", ")}], rank: ${rawLayersModelOutputRank}`);

    // 2. Inspect logits and argMax behavior on WebGPU
    const { logitsShape, argMaxShape, argMaxRank, argMaxValue } = tf.tidy(() => {
      const logits = rawOutputTensor.squeeze<tf.Tensor2D>([0]);
      const lastTokenLogits = logits.slice([logits.shape[0] - 1]).squeeze<tf.Tensor1D>([0]);
      const probs = lastTokenLogits.softmax();
      const argMax = probs.argMax();
      return {
        logitsShape: logits.shape,
        argMaxShape: argMax.shape,
        argMaxRank: argMax.rank,
        argMaxValue: argMax.arraySync(),
      };
    });
    log(`Logits shape: [${logitsShape.join(", ")}]`);
    log(`probs.argMax() tensor shape on ${activeBackend}: [${argMaxShape.join(", ")}], rank: ${argMaxRank}, value: ${JSON.stringify(argMaxValue)}`);

    // 3. Inspect high-level model.predict() with greedy decoding (doSample: false)
    const greedyBatchResult = await trainedModel.predict(List.of(promptTokens), { doSample: false });
    const greedyFirst = greedyBatchResult.first();
    const greedyShapeDescription = Array.isArray(greedyFirst)
      ? `[[${(greedyFirst as number[]).length}]] (nested array, e.g. [[${greedyFirst[0]}]])`
      : `[${greedyBatchResult.size}] (scalar token: ${greedyFirst})`;
    log(`model.predict(greedy) returned: ${JSON.stringify(greedyBatchResult.toArray())}`);
    log(`model.predict(greedy) structure: ${greedyShapeDescription}`);

    // 4. Inspect high-level model.predict() with sampled decoding (doSample: true)
    const sampledBatchResult = await trainedModel.predict(List.of(promptTokens), {
      doSample: true,
      temperature: 0.8,
      topk: 40,
      seed: 42,
    });
    const sampledFirst = sampledBatchResult.first();
    const sampledShapeDescription = Array.isArray(sampledFirst)
      ? `[[${(sampledFirst as number[]).length}]] (nested array: [[${sampledFirst[0]}]])`
      : `[${sampledBatchResult.size}] (scalar token: ${sampledFirst})`;
    log(`model.predict(sampled) returned: ${JSON.stringify(sampledBatchResult.toArray())}`);
    log(`model.predict(sampled) structure: ${sampledShapeDescription}`);

    // 5. Multi-token generation: Greedy
    log("Generating 20 tokens with Greedy decoding...");
    let greedyTokens = promptTokens;
    const greedyNewTokens: number[] = [];
    for (let i = 0; i < 20; i++) {
      const pred = await trainedModel.predict(List.of(greedyTokens), { doSample: false });
      const raw = pred.first();
      // Notice: on WebGPU, raw is [tokenId], while on WebGL it is tokenId
      const tokenId = Array.isArray(raw) ? (raw as number[])[0] : (raw as number);
      greedyNewTokens.push(tokenId);
      greedyTokens = greedyTokens.push(tokenId);
    }
    const greedyContinuationText = tokenizer.decode(greedyNewTokens);
    const greedyFullText = tokenizer.decode(greedyTokens.toArray());
    log(`Greedy generated tokens: [${greedyNewTokens.join(", ")}]`);
    log(`Greedy continuation: "${greedyContinuationText}"`);
    log(`Greedy full text:\n${greedyFullText}`);

    // 6. Multi-token generation: Sampled
    log("Generating 20 tokens with Sampled decoding...");
    let sampledTokens = promptTokens;
    const sampledNewTokens: number[] = [];
    for (let i = 0; i < 20; i++) {
      const pred = await trainedModel.predict(List.of(sampledTokens), {
        doSample: true,
        temperature: 0.8,
        topk: 40,
        seed: 42 + i,
      });
      const raw = pred.first();
      const tokenId = Array.isArray(raw) ? (raw as number[])[0] : (raw as number);
      sampledNewTokens.push(tokenId);
      sampledTokens = sampledTokens.push(tokenId);
    }
    const sampledContinuationText = tokenizer.decode(sampledNewTokens);
    const sampledFullText = tokenizer.decode(sampledTokens.toArray());
    log(`Sampled generated tokens: [${sampledNewTokens.join(", ")}]`);
    log(`Sampled continuation: "${sampledContinuationText}"`);
    log(`Sampled full text:\n${sampledFullText}`);

    const results = {
      success: true,
      backend: activeBackend,
      roundsCompleted: roundNum,
      syncEventCount,
      finalWeightSum,
      batchLogs,
      prompt,
      promptTokens: promptTokens.toArray(),
      rawLayersModelOutputShape,
      rawLayersModelOutputRank,
      argMaxShape,
      argMaxRank,
      argMaxValue,
      greedyBatchResult: greedyBatchResult.toArray(),
      greedyShapeDescription,
      sampledBatchResult: sampledBatchResult.toArray(),
      sampledShapeDescription,
      greedyNewTokens,
      greedyContinuationText,
      greedyFullText,
      sampledNewTokens,
      sampledContinuationText,
      sampledFullText,
    };

    (window as unknown as { __SHAKESPEARE_RESULTS__: typeof results }).__SHAKESPEARE_RESULTS__ = results;
    setStatus("COMPLETED");
    log("ALL EXPERIMENTS COMPLETED SUCCESSFULLY.");

    const reportUrl = urlParams.get("reportUrl");
    if (reportUrl) {
      await fetch(reportUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(results),
      }).catch((e) => console.error("Failed to POST report:", e));
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Experiment failed:", err);
    log(`ERROR: ${err.message}\n${err.stack}`);
    setStatus("ERROR: " + err.message);
    (window as unknown as { __SHAKESPEARE_ERROR__: string }).__SHAKESPEARE_ERROR__ = err.message;

    try {
      const reportUrl = new URLSearchParams(window.location.search).get("reportUrl");
      if (reportUrl) {
        await fetch(reportUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: err.message, stack: err.stack }),
        });
      }
    } catch {}
  }
}

void run();
